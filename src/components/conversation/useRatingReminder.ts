import { parseRatingFollowUp } from "@/src/services/conversation.rating.helpers";
import type { ConversationView, ConversationViewAction } from "@/src/services/conversation.service";
import { closePopup, hasOpenPopup, openPopup, subscribePopup, type PopupSummaryConfig } from "@/src/services/popup.service";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import { useEffect, useMemo, useRef, useState } from "react";

export function useRatingReminder(view: ConversationView | null, profileId: string | null,
  isExecuting: boolean, onRate: (action: ConversationViewAction) => void) {
  const focused = useIsFocused();
  const followUp = useMemo(() => view ? parseRatingFollowUp(view.context) : null, [view]);
  const reminderKey = followUp?.reminderKey ?? null;
  const source = view && profileId ? `${profileId}:${view.conversation.id}` : null;
  const baseline = useRef<{ source: string; key: string | null } | null>(null);
  const ownedPopup = useRef<PopupSummaryConfig | null>(null);
  const seen = useRef(new Set<string>());
  const [pending, setPending] = useState<string | null>(null);
  const [popupOpen, setPopupOpen] = useState(hasOpenPopup);

  useEffect(() => subscribePopup(({ config }) => {
    setPopupOpen(config !== null);
    if (config !== ownedPopup.current) ownedPopup.current = null;
  }), []);

  useEffect(() => {
    if (!focused || !source || !view) {
      baseline.current = null;
      setPending(null);
      if (ownedPopup.current) closePopup();
      return;
    }
    if (baseline.current?.source === source && reminderKey && reminderKey !== baseline.current.key) setPending(reminderKey);
    baseline.current = { source, key: reminderKey };
    if (!reminderKey) setPending(null);
  }, [focused, reminderKey, source, view]);

  useEffect(() => {
    if (!pending || !focused || isExecuting || popupOpen || !source || !view || !followUp || pending !== reminderKey) return;
    const action = view.actions.find((candidate) => candidate.id === followUp.actionId);
    if (!action) return;
    const key = `luppit:rating-reminder:${source}:${pending}`;
    let canceled = false;
    void (async () => {
      const alreadySeen = seen.current.has(key) || await AsyncStorage.getItem(key).catch(() => null);
      if (canceled || hasOpenPopup()) return;
      setPending(null);
      if (alreadySeen) return;
      seen.current.add(key);
      void AsyncStorage.setItem(key, "seen").catch(() => undefined);
      const config: PopupSummaryConfig = {
        type: "summary", title: followUp.title,
        metadata: [followUp.targetName, view.context.offer_name].filter(Boolean).join(" · "),
        description: followUp.description,
        actions: [
          { id: "rating-later", label: followUp.laterLabel, backgroundColorKey: "backgroudWhite", textColorKey: "textDark" },
          { id: "rating-now", label: followUp.actionLabel, backgroundColorKey: "primary", textColorKey: "backgroudWhite",
            onPress: () => { onRate(action); return false; } },
        ],
      };
      ownedPopup.current = config;
      openPopup(config);
    })();
    return () => { canceled = true; };
  }, [focused, followUp, isExecuting, onRate, pending, popupOpen, reminderKey, source, view]);

  useEffect(() => () => { if (ownedPopup.current) closePopup(); }, []);
}

import { Roles } from "@/src/services/role.service";
import React from "react";
import { useRole } from "./RoleContext";

type RoleGateProps = {
  buyer: React.ReactNode;
  seller: React.ReactNode;
  loading?: React.ReactNode;
};

export default function RoleGate({
  buyer,
  seller,
  loading = null,
}: RoleGateProps) {
  const { role, isLoading } = useRole();

  if (isLoading) return <>{loading}</>;

  return <>{role === Roles.SELLER ? seller : buyer}</>;
}

import assert from "node:assert/strict";
import test from "node:test";
import {
  createProfileImageObjectPath,
  createProfileImageStagingPath,
  createProfileImageStorageReference,
  detectProfileImageMimeType,
  getProfileImageFunctionErrorCode,
  isExpectedProfileImageObjectPath,
  isExpectedProfileImageStagingPath,
  isProfileImageObjectPath,
  MAX_PROFILE_IMAGE_BYTES,
  parseProfileImageStorageReference,
  validateProfileImage,
} from "../src/services/profile-image.helpers.ts";

const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
const pngBytes = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const webpBytes = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

test("maps the hosted missing-function response to a release-specific error", () => {
  assert.equal(
    getProfileImageFunctionErrorCode({
      code: "NOT_FOUND",
      message: "Requested function was not found",
    }),
    "profile_image_function_not_deployed"
  );
  assert.equal(
    getProfileImageFunctionErrorCode({ error_code: "profile_image_not_allowed" }),
    "profile_image_not_allowed"
  );
});

test("detects supported profile image formats from their bytes", () => {
  assert.equal(detectProfileImageMimeType(jpegBytes), "image/jpeg");
  assert.equal(detectProfileImageMimeType(pngBytes), "image/png");
  assert.equal(detectProfileImageMimeType(webpBytes), "image/webp");
});

test("accepts a profile image only when bytes, extension and MIME agree", () => {
  const result = validateProfileImage(
    {
      uri: "file:///photo.jpg",
      name: "photo.jpg",
      mime: "image/jpeg",
      size: jpegBytes.byteLength,
    },
    jpegBytes,
    "image/jpeg; charset=binary"
  );

  assert.deepEqual(result, {
    ok: true,
    data: { extension: "jpg", contentType: "image/jpeg" },
  });
});

test("rejects spoofed extensions and MIME declarations", () => {
  const extensionMismatch = validateProfileImage(
    { uri: "file:///photo.png", mime: "image/png" },
    jpegBytes,
    "image/png"
  );
  const mimeMismatch = validateProfileImage(
    { uri: "file:///photo.webp", mime: "image/jpeg" },
    webpBytes,
    "image/webp"
  );

  assert.equal(extensionMismatch.ok, false);
  assert.equal(mimeMismatch.ok, false);
});

test("rejects a declared or fetched image larger than 4 MB", () => {
  const declaredTooLarge = validateProfileImage(
    {
      uri: "file:///photo.jpg",
      size: MAX_PROFILE_IMAGE_BYTES + 1,
    },
    jpegBytes
  );
  const fetchedTooLarge = validateProfileImage(
    { uri: "file:///photo.jpg" },
    new Uint8Array(MAX_PROFILE_IMAGE_BYTES + 1)
  );

  assert.equal(declaredTooLarge.ok, false);
  assert.equal(fetchedTooLarge.ok, false);
  if (!declaredTooLarge.ok) {
    assert.equal(declaredTooLarge.error.code, "profile_image_too_large");
  }
  if (!fetchedTooLarge.ok) {
    assert.equal(fetchedTooLarge.error.code, "profile_image_too_large");
  }
});

test("creates and recognizes owner-scoped immutable object paths", () => {
  const buyerId = "20000000-0000-4000-8000-000000000001";
  const businessId = "30000000-0000-4000-8000-000000000001";
  const objectId = "40000000-0000-4000-8000-000000000001";
  const buyerPath = createProfileImageObjectPath(
    "buyer_profile",
    buyerId,
    "jpeg",
    objectId
  );
  const businessPath = createProfileImageObjectPath(
    "business",
    businessId,
    "webp",
    objectId
  );

  assert.equal(buyerPath, `buyers/${buyerId}/${objectId}.jpeg`);
  assert.equal(businessPath, `businesses/${businessId}/${objectId}.webp`);
  assert.equal(
    isExpectedProfileImageObjectPath(buyerPath, "buyer_profile", buyerId),
    true
  );
  assert.equal(
    isExpectedProfileImageObjectPath(
      buyerPath,
      "buyer_profile",
      "20000000-0000-4000-8000-000000000002"
    ),
    false
  );
  assert.equal(isProfileImageObjectPath(businessPath), true);
  assert.equal(
    isProfileImageObjectPath(`businesses/${businessId}/not-a-uuid.webp`),
    false
  );
  assert.equal(isProfileImageObjectPath("businesses/not-a-uuid/file.webp"), false);
});

test("creates and recognizes profile-scoped staging paths", () => {
  const profileId = "20000000-0000-4000-8000-000000000001";
  const businessId = "30000000-0000-4000-8000-000000000001";
  const objectId = "40000000-0000-4000-8000-000000000001";
  const path = createProfileImageStagingPath(
    profileId,
    "business",
    businessId,
    "webp",
    objectId
  );

  assert.equal(
    path,
    `pending/${profileId}/business/${businessId}/${objectId}.webp`
  );
  assert.equal(
    isExpectedProfileImageStagingPath(
      path,
      profileId,
      "business",
      businessId
    ),
    true
  );
  assert.equal(
    isExpectedProfileImageStagingPath(
      path,
      "20000000-0000-4000-8000-000000000002",
      "business",
      businessId
    ),
    false
  );
});

test("maps only canonical profile-image storage references", () => {
  const entityId = "30000000-0000-4000-8000-000000000001";
  const objectId = "40000000-0000-4000-8000-000000000001";
  const objectPath = `businesses/${entityId}/${objectId}.webp`;
  const reference = createProfileImageStorageReference(
    "profile-images",
    objectPath
  );

  assert.equal(
    reference,
    `storage://profile-images/${objectPath}`
  );
  assert.ok(reference);
  assert.equal(
    parseProfileImageStorageReference(reference, "profile-images"),
    objectPath
  );
  assert.equal(
    parseProfileImageStorageReference(
      `storage://other-bucket/${objectPath}`,
      "profile-images"
    ),
    null
  );
  assert.equal(
    parseProfileImageStorageReference(
      "storage://profile-images/businesses/not-a-uuid/file.webp",
      "profile-images"
    ),
    null
  );
  assert.equal(
    createProfileImageStorageReference("profile-images", "buyers/bad/path.jpg"),
    null
  );
});

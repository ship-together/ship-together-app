# Ship Together Security Specification

## 1. Data Invariants
1. **Profile Ownership**: A user can only create or modify the `/profiles/{userId}` document matching their verified `request.auth.uid`, and no PII (emails, phone numbers) is stored in `/profiles`.
2. **Post & Project Authorship**: Only verified authenticated authors (`authorId == request.auth.uid` / `ownerId == request.auth.uid`) can create, edit, or delete their own posts and projects.
3. **Comment Authorship**: Only verified authenticated users can post comments under existing posts, and only the comment's author can delete it.
4. **Duplicate Like Prevention & Atomic Counts**: A user's like is keyed strictly as `/posts/{postId}/likes/{request.auth.uid}` and must atomically match a `+1` or `-1` delta on `posts/{postId}.likesCount`.
5. **Private Collaboration Applications**: `/collaboration_applications/{applicationId}` documents are readable (`get` and `list`) exclusively by `applicantId == request.auth.uid` or `opportunityOwnerId == request.auth.uid`, and only the opportunity owner can transition `status` once from `'Pending'` to `'Accepted'` or `'Rejected'`.
6. **URL Hygiene**: All link URLs (`projectUrl`, `liveDemoUrl`, `githubUrl`, `portfolioUrl`) are restricted to `https?://` and never permit `javascript:` or `data:` schemes. Image fields (`avatarUrl`, `coverImageUrl`) allow `https?://`, local `/images/*.jpg` (or legacy `/src/assets/images/*.jpg`) preset covers, or strictly raster `data:image/(webp|jpeg|png|gif);base64,...` fallback data URLs under 280,000 chars (never SVG/HTML).

## 2. Adversarial Payloads ("Dirty Dozen")
1. **Unverified email write**: Unverified user attempts to create `/posts/p1` -> `PERMISSION_DENIED`.
2. **Profile hijack**: User A attempts to update `/profiles/userB` -> `PERMISSION_DENIED`.
3. **Post author spoofing**: User A creates `/posts/p1` with `authorId: "userB"` -> `PERMISSION_DENIED`.
4. **Shadow field injection**: User A updates `/projects/proj1` adding `isFeatured: true` -> `PERMISSION_DENIED`.
5. **Client timestamp forgery**: User A creates `/posts/p1` with backdated `createdAt` -> `PERMISSION_DENIED`.
6. **Duplicate / inflated like**: User A updates `/posts/p1.likesCount` by `+5` without batching `/likes/{uid}` -> `PERMISSION_DENIED`.
7. **Unauthorized post edit**: User B attempts to edit `/posts/p1` owned by User A -> `PERMISSION_DENIED`.
8. **Comment deletion by non-author**: User B attempts to delete User A's comment -> `PERMISSION_DENIED`.
9. **Private application snooping**: User C calls `list` or `get` on `/collaboration_applications` belonging to User A & User B -> `PERMISSION_DENIED`.
10. **Self-acceptance of application**: Applicant User A updates `status: "Accepted"` on their own application -> `PERMISSION_DENIED`.
11. **Terminal state mutation**: Opportunity owner attempts to reopen an already `'Accepted'` application back to `'Pending'` -> `PERMISSION_DENIED`.
12. **XSS URL scheme**: User submits `githubUrl: "javascript:alert(1)"` -> `PERMISSION_DENIED`.

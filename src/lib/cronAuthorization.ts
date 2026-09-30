/** Missing configuration must never turn a scheduled write endpoint public. */
export function isAuthorizedCronRequest(authorization: string | null, secret: string | undefined): boolean {
  return Boolean(secret?.trim()) && authorization === `Bearer ${secret}`;
}

export const PUBLIC_APP_ORIGIN = 'https://raynham-os.taskade.site';

export const fieldUrl = (): string => `${PUBLIC_APP_ORIGIN}/#/field`;
export const anchorUrl = (anchorId: string): string => `${PUBLIC_APP_ORIGIN}/#/a/${anchorId}`;
export const anchorReportUrl = (anchorId: string): string => `${PUBLIC_APP_ORIGIN}/#/a/${anchorId}/report`;

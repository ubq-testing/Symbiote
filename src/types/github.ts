import { RestEndpointMethodTypes } from "@ubiquity-os/plugin-sdk/octokit";

export type UserEvent = RestEndpointMethodTypes["activity"]["listPublicEventsForUser"]["response"]["data"][0];
export type Notification = RestEndpointMethodTypes["activity"]["listNotificationsForAuthenticatedUser"]["response"]["data"][0];

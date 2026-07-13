/**
 * Port for Home Assistant.
 *
 * The adapter will talk to the HA REST/WebSocket API (URL + long-lived access
 * token, both server-side — see `src/lib/env.ts`). Useful for pulling data
 * from home sensors (air quality, scale, presence) into the dashboard.
 */
export interface HomeAssistantEntityState {
  entityId: string;
  state: string;
  attributes: Record<string, unknown>;
  lastChanged: string;
}

export interface HomeAssistantClient {
  isConnected(): Promise<boolean>;
  getState(entityId: string): Promise<HomeAssistantEntityState>;
  getStates(entityIds: string[]): Promise<HomeAssistantEntityState[]>;
}

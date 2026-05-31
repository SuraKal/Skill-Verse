import {
  API_BASE_URL,
  authorizedFetch,
  parseJson,
} from '../api'
import type {
  SkillChatMessage,
  SkillChatThread,
  SkillSwapDashboardData,
  SkillSwapProfile,
  SkillSwapProfileUpdatePayload,
} from '../../types'

export async function fetchSkillSwapDashboard(token: string): Promise<SkillSwapDashboardData> {
  const response = await authorizedFetch(`${API_BASE_URL}/skill-swap/`, {}, token)
  return parseJson<SkillSwapDashboardData>(response)
}

export async function fetchSkillSwapProfile(token: string): Promise<SkillSwapProfile> {
  const response = await authorizedFetch(`${API_BASE_URL}/skill-swap/profile/`, {}, token)
  return parseJson<SkillSwapProfile>(response)
}

export async function updateSkillSwapProfile(
  token: string,
  payload: SkillSwapProfileUpdatePayload,
): Promise<SkillSwapProfile> {
  const response = await authorizedFetch(`${API_BASE_URL}/skill-swap/profile/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }, token)
  return parseJson<SkillSwapProfile>(response)
}

export async function fetchSkillSwapThread(
  token: string,
  threadId: string,
): Promise<SkillChatThread> {
  const response = await authorizedFetch(`${API_BASE_URL}/skill-swap/threads/${threadId}/messages/`, {}, token)
  return parseJson<SkillChatThread>(response)
}

export async function sendSkillSwapMessage(
  token: string,
  threadId: string,
  body: string,
): Promise<SkillChatMessage> {
  const response = await authorizedFetch(`${API_BASE_URL}/skill-swap/threads/${threadId}/messages/`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  }, token)
  return parseJson<SkillChatMessage>(response)
}

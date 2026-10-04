import { normalizeAssetHistory } from '../lib/asset-history'
import { supabase } from '../lib/supabase'

export async function loadParticipantAssetHistory(leagueId: string, nickname: string, signal: AbortSignal) {
  if (!supabase) throw new Error('Supabase 연결 정보가 설정되지 않았습니다.')
  const { data, error } = await supabase.rpc('randoland_get_participant_asset_history', {
    p_league_id: leagueId,
    p_nickname: nickname,
  }).abortSignal(signal)

  if (error) throw new Error('자산 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
  return normalizeAssetHistory(data)
}

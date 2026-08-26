import type { SkillDef } from '../types';

/** Подставляет числа навыка с учётом его уровня в описание */
export function skillText(skill: SkillDef, level: number): string {
  const e = skill.effects[0];
  let value = '';
  if (e) {
    if (e.t === 'damage' || e.t === 'heal' || e.t === 'shield' || e.t === 'dot') {
      value = String(Math.round(e.mult * (1 + 0.11 * (level - 1)) * 100));
    } else if (e.t === 'energy') {
      value = String(e.amount);
    } else if (e.t === 'mod') {
      value = String(Math.round(Math.abs(e.pct) * (1 + 0.06 * (level - 1))));
    } else if (e.t === 'stun') {
      value = String(e.dur);
    } else if (e.t === 'revive') {
      value = String(Math.round(e.hpPct * 100));
    }
  }
  return skill.text.replace('{0}', value);
}

export const SKILL_KIND_LABEL: Record<SkillDef['kind'], string> = {
  basic: 'Базовый',
  ultimate: 'Ультимейт',
  passive: 'Пассивка',
};

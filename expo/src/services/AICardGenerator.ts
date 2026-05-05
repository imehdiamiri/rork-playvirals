/**
 * AICardGenerator — matches iOS AICardGeneratorViewModel
 * Content moderation + LLM prompt builder for party card generation.
 * NOTE: Requires an OpenAI-compatible API endpoint to be configured.
 */

import { CardCategory, CardCategoryInfo, CardSubtype } from '../models/CardModels';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Content Moderation ───

const UNSAFE_PATTERNS = [
  /\b(kill|murder|suicide|rape|assault|weapon|gun|knife|bomb|drugs?|cocaine|heroin|meth)\b/i,
  /\b(racist|sexist|homophobic|slur|hate\s*speech)\b/i,
  /\b(child|minor|underage)\b/i,
  /\b(nazi|terrorist|extremist)\b/i,
];

export function isSafeContent(text: string): boolean {
  return !UNSAFE_PATTERNS.some(pattern => pattern.test(text));
}

// ─── Usage Tracking ───

function todayKey(): string {
  return `ai.cards.usage.${new Date().toISOString().split('T')[0]}`;
}

export async function getUsageToday(): Promise<number> {
  const val = await AsyncStorage.getItem(todayKey());
  return val ? parseInt(val, 10) : 0;
}

export async function bumpUsage(): Promise<void> {
  const current = await getUsageToday();
  await AsyncStorage.setItem(todayKey(), String(current + 1));
}

export const FREE_DAILY_LIMIT = 5;

export async function getRemainingGenerations(isPremium: boolean): Promise<number> {
  if (isPremium) return Infinity;
  const used = await getUsageToday();
  return Math.max(0, FREE_DAILY_LIMIT - used);
}

// ─── Category Rules (for prompt) ───

function categoryRule(c: CardCategory): string {
  switch (c) {
    case CardCategory.Act: return 'Must be something to perform physically. Short and actable.';
    case CardCategory.Talk: return 'Must be a question or discussion prompt.';
    case CardCategory.Challenges: return 'Must include a rule, time, or condition.';
    case CardCategory.Penalty: return 'Must feel like a punishment for losing. Short and immediate.';
    case CardCategory.Couple: return 'Must involve a relationship or two people.';
    default: return '';
  }
}

function subtypeDescription(s: CardSubtype): string {
  const map: Record<string, string> = {
    pantomime: 'Silent acting, no words.',
    dare: 'A bold thing to do right now.',
    funnyAction: 'A silly physical performance.',
    starters: 'Easy conversation starter for new people.',
    personal: 'Personal question about the player.',
    discussion: 'Open topic the group can debate.',
    truth: 'Honest confession question.',
    explainGuess: 'A word or scene to explain or guess.',
    icebreaker: 'Light playful warm up prompt.',
    speech: 'A rule about how the player talks.',
    behavior: 'A rule about how the player acts or moves.',
    timeLimit: 'Must be done within a short time.',
    penaltyFunny: 'A silly, funny consequence.',
    embarrassing: 'A mildly embarrassing consequence.',
    groupChoice: 'The group picks the punishment style.',
    coupleQuestions: 'Question for a couple or pair.',
    dynamics: 'Prompt about relationship dynamics.',
    playful: 'Playful task between two people.',
  };
  return map[s] || '';
}

// ─── Prompt Builder ───

export function buildAICardPrompt(
  category: CardCategory,
  subtype: CardSubtype | null,
  userTopic: string
): { system: string; user: string } {
  const trimmed = userTopic.trim();
  const userRequest = trimmed || '(no specific request)';

  const subtypeLine = subtype
    ? `Subtype: ${subtype}. ${subtypeDescription(subtype)}`
    : 'Subtype: any subtype of this category.';

  const system = `You are a party game card generator. You produce safe, fun, group-appropriate content only.
NEVER produce content that is violent, sexual, discriminatory, or unsafe for a general audience.
If the user requests anything inappropriate, produce a neutral, fun alternative instead.
Return ONLY valid JSON. No markdown, no code fences.`;

  const user = `Generate ONE party game card.

Category: ${CardCategoryInfo[category]?.title || category}. ${categoryRule(category)}
${subtypeLine}
User request: ${userRequest}

Rules:
- Exactly ONE sentence
- No emojis
- No quotation marks
- No explanation
- Under 20 words
- Natural, human-like
- Must match the category behavior exactly
- Safe and appropriate for a general-audience group

Return strictly this JSON:
{"text":"..."}`;

  return { system, user };
}

// ─── Placeholder text per category ───

export function getPlaceholder(category: CardCategory): string {
  switch (category) {
    case CardCategory.Talk: return 'e.g. create a conversation starter for new friends';
    case CardCategory.Couple: return 'e.g. create a playful question about their relationship';
    case CardCategory.Act: return 'e.g. create a funny acting scenario';
    case CardCategory.Challenges: return 'e.g. create a short speaking challenge';
    case CardCategory.Penalty: return 'e.g. create a funny punishment for the loser';
    default: return 'Describe what kind of card you want...';
  }
}

// ─── Subtypes per Category ───

export const CATEGORY_SUBTYPES: Record<CardCategory, CardSubtype[]> = {
  [CardCategory.Act]: [CardSubtype.Pantomime, CardSubtype.Dare, CardSubtype.Funnyaction],
  [CardCategory.Talk]: [CardSubtype.Starters, CardSubtype.Personal, CardSubtype.Discussion, CardSubtype.Truth, CardSubtype.Explainguess, CardSubtype.Icebreaker],
  [CardCategory.Challenges]: [CardSubtype.Speech, CardSubtype.Behavior, CardSubtype.Timelimit],
  [CardCategory.Penalty]: [CardSubtype.Penaltyfunny, CardSubtype.Embarrassing, CardSubtype.Groupchoice],
  [CardCategory.Couple]: [CardSubtype.Couplequestions, CardSubtype.Dynamics, CardSubtype.Playful],
};

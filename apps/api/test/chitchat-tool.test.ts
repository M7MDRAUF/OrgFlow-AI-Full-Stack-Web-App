// rag-chat-agent — Unit tests for the chitchat intent detector. The detector
// must catch greetings, thanks, identity prompts, etc. while still letting any
// message that mentions a workspace entity ("hi, how many tasks?") fall
// through to the normal grounded RAG path.
import { describe, expect, it } from 'vitest';
import { detectChitchatIntent } from '../src/modules/ai/chat/chitchat-tool.js';

describe('detectChitchatIntent', () => {
  it.each([
    ['hi', 'greeting'],
    ['Hello!', 'greeting'],
    ['hey there', 'greeting'],
    ['good morning', 'greeting'],
    ['hi, how are you?', 'how_are_you'],
    ['how are you doing', 'how_are_you'],
    ["what's up", 'how_are_you'],
    ['thanks', 'thanks'],
    ['thank you', 'thanks'],
    ['bye', 'farewell'],
    ['goodbye', 'farewell'],
    ['who are you?', 'identity'],
    ['what can you do', 'identity'],
  ] as const)('classifies %j as %s', (input, expected) => {
    const intent = detectChitchatIntent(input);
    expect(intent).not.toBeNull();
    expect(intent?.kind).toBe(expected);
  });

  it.each([
    ['how many tasks do I have?'],
    ['list my projects'],
    ['hi, how many users are in my team?'],
    ['what is the vacation policy?'],
    ['show me overdue tasks'],
    ['who is the team leader of marketing?'],
  ])('does NOT classify workspace question %j as chitchat', (input) => {
    expect(detectChitchatIntent(input)).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(detectChitchatIntent('')).toBeNull();
    expect(detectChitchatIntent('   ')).toBeNull();
  });
});

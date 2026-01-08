import React, { useMemo, useState } from 'react';
import { Alert, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { testerFeedbackV1, type SurveyDefinition, type SurveyQuestion } from '../../surveys/testerFeedbackV1';

type Answers = Record<string, any>;

function Rating1to7({ value, onChange }: { value?: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.ratingRow}>
      {Array.from({ length: 7 }).map((_, i) => {
        const n = i + 1;
        const active = value === n;
        return (
          <TouchableOpacity
            key={n}
            style={[styles.ratingPill, active && styles.ratingPillActive]}
            onPress={() => onChange(n)}
          >
            <Text style={[styles.ratingText, active && styles.ratingTextActive]}>{n}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ChoiceRow({
  options,
  value,
  onChange,
}: {
  options: string[];
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.choiceWrap}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.choiceChip, active && styles.choiceChipActive]}
            onPress={() => onChange(opt)}
          >
            <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MultiChoiceRow({
  options,
  value,
  onChange,
}: {
  options: string[];
  value?: string[];
  onChange: (v: string[]) => void;
}) {
  const selected = new Set(value || []);
  return (
    <View style={styles.choiceWrap}>
      {options.map((opt) => {
        const active = selected.has(opt);
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.choiceChip, active && styles.choiceChipActive]}
            onPress={() => {
              const next = new Set(selected);
              if (next.has(opt)) next.delete(opt);
              else next.add(opt);
              onChange(Array.from(next));
            }}
          >
            <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function BooleanRow({ value, onChange }: { value?: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.choiceWrap}>
      <TouchableOpacity
        style={[styles.choiceChip, value === true && styles.choiceChipActive]}
        onPress={() => onChange(true)}
      >
        <Text style={[styles.choiceText, value === true && styles.choiceTextActive]}>Yes</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.choiceChip, value === false && styles.choiceChipActive]}
        onPress={() => onChange(false)}
      >
        <Text style={[styles.choiceText, value === false && styles.choiceTextActive]}>No</Text>
      </TouchableOpacity>
    </View>
  );
}

function isMissingRequired(q: SurveyQuestion, answers: Answers): boolean {
  if (!q.required) return false;
  const v = answers[q.id];
  if (q.type === 'text') return !v || String(v).trim().length === 0;
  if (q.type === 'rating_1_7') return typeof v !== 'number' || v < 1 || v > 7;
  if (q.type === 'boolean') return typeof v !== 'boolean';
  if (q.type === 'single_choice') return !v;
  if (q.type === 'multi_choice') return !Array.isArray(v) || v.length === 0;
  return !v;
}

export default function TesterFeedbackScreen() {
  const { user } = useAuth();
  const survey: SurveyDefinition = testerFeedbackV1;

  const [answers, setAnswers] = useState<Answers>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<number | null>(null);

  const requiredMissing = useMemo(() => {
    const missing: string[] = [];
    for (const s of survey.sections) {
      for (const q of s.questions) {
        if (isMissingRequired(q, answers)) missing.push(q.id);
      }
    }
    return new Set(missing);
  }, [survey.sections, answers]);

  const setAnswer = (id: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const buildMeta = () => {
    const extra = Constants.expoConfig?.extra || {};
    return {
      source: 'tester-feedback',
      submittedAtClient: new Date().toISOString(),
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version || extra?.version || null,
      appName: Constants.expoConfig?.name || null,
      url: Platform.OS === 'web' ? window.location.href : null,
      userAgent: Platform.OS === 'web' ? window.navigator.userAgent : null,
    };
  };

  const handleSubmit = async () => {
    if (requiredMissing.size > 0) {
      Alert.alert('Missing required answers', 'Please complete the required questions (highlighted).');
      return;
    }
    if (answers.consent !== true) {
      Alert.alert('Consent required', 'Please agree to the consent statement to submit feedback.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        survey_key: survey.key,
        user_id: user?.id || null,
        answers,
        meta: buildMeta(),
        status: 'new',
      };

      const { data, error } = await supabase.from('app_feedback').insert(payload).select('id').single();
      if (error) throw error;
      setSubmittedId(data?.id ?? null);
    } catch (e: any) {
      console.error('[TesterFeedback] submit failed', e);
      Alert.alert('Could not submit', e?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.title}>Thank you!</Text>
          <Text style={styles.subtitle}>Your feedback has been submitted.</Text>
          <Text style={styles.meta}>Reference: #{submittedId}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setSubmittedId(null)}>
            <Text style={styles.primaryBtnText}>Submit another response</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{survey.title}</Text>
        {!!survey.intro && <Text style={styles.subtitle}>{survey.intro}</Text>}

        {survey.sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {!!section.description && <Text style={styles.sectionDescription}>{section.description}</Text>}

            {section.questions.map((q) => {
              const missing = requiredMissing.has(q.id);
              const v = answers[q.id];
              return (
                <View key={q.id} style={[styles.questionCard, missing && styles.questionCardMissing]}>
                  <Text style={styles.questionPrompt}>
                    {q.prompt}
                    {q.required ? <Text style={styles.required}> *</Text> : null}
                  </Text>
                  {!!q.description && <Text style={styles.questionDescription}>{q.description}</Text>}

                  {q.type === 'rating_1_7' ? (
                    <Rating1to7 value={typeof v === 'number' ? v : undefined} onChange={(n) => setAnswer(q.id, n)} />
                  ) : q.type === 'text' ? (
                    <TextInput
                      value={typeof v === 'string' ? v : ''}
                      onChangeText={(t) => setAnswer(q.id, t)}
                      placeholder="Type your answer…"
                      placeholderTextColor="#94A3B8"
                      multiline
                      style={styles.textArea}
                      editable={!submitting}
                    />
                  ) : q.type === 'single_choice' ? (
                    <ChoiceRow
                      options={q.options || []}
                      value={typeof v === 'string' ? v : undefined}
                      onChange={(x) => setAnswer(q.id, x)}
                    />
                  ) : q.type === 'multi_choice' ? (
                    <MultiChoiceRow
                      options={q.options || []}
                      value={Array.isArray(v) ? v : []}
                      onChange={(xs) => setAnswer(q.id, xs)}
                    />
                  ) : q.type === 'boolean' ? (
                    <BooleanRow value={typeof v === 'boolean' ? v : undefined} onChange={(b) => setAnswer(q.id, b)} />
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}

        <View style={styles.submitWrap}>
          <TouchableOpacity style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]} onPress={handleSubmit} disabled={submitting}>
            <Text style={styles.primaryBtnText}>{submitting ? 'Submitting…' : 'Submit feedback'}</Text>
          </TouchableOpacity>
          <Text style={styles.footerNote}>
            Tip: If you hit a bug, include steps to reproduce + severity (Low/Medium/High/Blocking).
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0f1e' },
  container: { padding: 16, paddingBottom: 32, gap: 12, maxWidth: 840, width: '100%', alignSelf: 'center' },
  title: { color: '#FFFFFF', fontSize: 26, fontWeight: '900' },
  subtitle: { color: '#94A3B8', fontSize: 14, fontWeight: '700', lineHeight: 20 },
  meta: { color: '#94A3B8', fontSize: 13, fontWeight: '700', marginTop: 8 },

  section: { marginTop: 16, gap: 10 },
  sectionTitle: { color: '#00F5FF', fontSize: 16, fontWeight: '900' },
  sectionDescription: { color: '#94A3B8', fontSize: 13, fontWeight: '700' },

  questionCard: {
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  questionCardMissing: { borderColor: 'rgba(255,0,110,0.8)' },
  questionPrompt: { color: '#E2E8F0', fontSize: 14, fontWeight: '900' },
  required: { color: '#FF006E' },
  questionDescription: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },

  ratingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ratingPill: { borderWidth: 1, borderColor: 'rgba(148,163,184,0.35)', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
  ratingPillActive: { borderColor: '#00F5FF', backgroundColor: 'rgba(0,245,255,0.14)' },
  ratingText: { color: '#CBD5E1', fontWeight: '900' },
  ratingTextActive: { color: '#00F5FF' },

  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  choiceChip: { borderWidth: 1, borderColor: 'rgba(148,163,184,0.35)', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
  choiceChipActive: { borderColor: '#00F5FF', backgroundColor: 'rgba(0,245,255,0.14)' },
  choiceText: { color: '#CBD5E1', fontWeight: '900', fontSize: 12 },
  choiceTextActive: { color: '#00F5FF' },

  textArea: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlignVertical: 'top',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },

  submitWrap: { marginTop: 8, gap: 10 },
  primaryBtn: { backgroundColor: '#00F5FF', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#000', fontWeight: '900' },
  footerNote: { color: '#94A3B8', fontSize: 12, fontWeight: '700', lineHeight: 18 },
});


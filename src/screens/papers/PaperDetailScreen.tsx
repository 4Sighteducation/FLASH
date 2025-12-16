import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../../components/Icon';

interface ExamPaper {
  id: string;
  year: number;
  exam_series: string;
  paper_number: number;
  component_code: string;
  question_paper_url: string | null;
  mark_scheme_url: string | null;
  examiner_report_url: string | null;
  quality_tier: number;
  questions_extracted: boolean;
  questions_count: number;
}

export default function PaperDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { stagingSubjectId, subjectName, examBoard, subjectColor } = route.params as any;
  
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTier, setFilterTier] = useState<number | null>(null);

  useEffect(() => {
    loadPapers();
  }, []);

  const loadPapers = async () => {
    try {
      console.log('[PaperDetail] Loading papers for staging subject:', stagingSubjectId);
      
      // Load papers from staging
      const { data, error } = await supabase
        .from('staging_aqa_exam_papers')
        .select('*')
        .eq('subject_id', stagingSubjectId)
        .gte('year', 2000)
        .lte('year', 2030)
        .not('paper_number', 'eq', -1)
        .order('year', { ascending: false })
        .order('exam_series')
        .order('paper_number');
      
      console.log('[PaperDetail] Found papers:', data?.length);

      if (error) throw error;

      const papersWithQuality = (data || []).map((paper: any) => ({
        ...paper,
        quality_tier: paper.examiner_report_url ? 1 : paper.mark_scheme_url ? 2 : 3,
        questions_extracted: false,
        questions_count: 0,
      }));

      // Count extracted questions per paper so we can show "READY" indicators.
      // This is a small N (per subject) so a per-paper count query is acceptable and avoids downloading all question rows.
      const withCounts = await Promise.all(
        papersWithQuality.map(async (paper: any) => {
          try {
            const { count, error: countError } = await supabase
              .from('exam_questions')
              .select('id', { count: 'exact', head: true })
              .eq('paper_id', paper.id);

            if (countError) throw countError;

            const questions_count = count || 0;
            return {
              ...paper,
              questions_count,
              questions_extracted: questions_count > 0,
            };
          } catch (e) {
            console.warn('[PaperDetail] Failed to count questions for paper:', paper.id, e);
            return paper;
          }
        })
      );

      setPapers(withCounts as any);
    } catch (error) {
      console.error('Error loading papers:', error);
    } finally {
      setLoading(false);
    }
  };

  const openPDF = (url: string) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  const startPractice = (paper: ExamPaper) => {
    navigation.navigate('QuestionPractice' as never, {
      paperId: paper.id,
      paperName: `${paper.year} ${paper.exam_series} Paper ${paper.paper_number}`,
      subjectName,
      subjectColor,
    } as never);
  };

  const getQualityBadge = (tier: number) => {
    switch (tier) {
      case 1:
        return { emoji: '✅', text: 'VERIFIED', color: '#10B981' };
      case 2:
        return { emoji: '⭐', text: 'OFFICIAL', color: '#3B82F6' };
      case 3:
        return { emoji: '🤖', text: 'AI-ASSISTED', color: '#8B5CF6' };
      default:
        return { emoji: '', text: '', color: '#666' };
    }
  };

  // Group papers by year
  const papersByYear = papers.reduce((acc, paper) => {
    if (!acc[paper.year]) {
      acc[paper.year] = [];
    }
    acc[paper.year].push(paper);
    return acc;
  }, {} as Record<number, ExamPaper[]>);

  const filteredPapers = filterTier
    ? papers.filter(p => p.quality_tier === filterTier)
    : papers;

  const filteredByYear = filteredPapers.reduce((acc, paper) => {
    if (!acc[paper.year]) {
      acc[paper.year] = [];
    }
    acc[paper.year].push(paper);
    return acc;
  }, {} as Record<number, ExamPaper[]>);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00F5FF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#00F5FF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.pageTitle}>{subjectName}</Text>
            <Text style={styles.pageSubtitle}>{examBoard} • {papers.length} papers</Text>
          </View>
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterChips}>
            <TouchableOpacity
              style={[styles.filterChip, !filterTier && styles.filterChipActive]}
              onPress={() => setFilterTier(null)}
            >
              <Text style={[styles.filterChipText, !filterTier && styles.filterChipTextActive]}>
                All ({papers.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, filterTier === 1 && styles.filterChipActive]}
              onPress={() => setFilterTier(1)}
            >
              <Text style={[styles.filterChipText, filterTier === 1 && styles.filterChipTextActive]}>
                ✅ Verified
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, filterTier === 2 && styles.filterChipActive]}
              onPress={() => setFilterTier(2)}
            >
              <Text style={[styles.filterChipText, filterTier === 2 && styles.filterChipTextActive]}>
                ⭐ Official
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, filterTier === 3 && styles.filterChipActive]}
              onPress={() => setFilterTier(3)}
            >
              <Text style={[styles.filterChipText, filterTier === 3 && styles.filterChipTextActive]}>
                🤖 AI-Assisted
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Papers by Year */}
        <View style={styles.papersContainer}>
          {Object.keys(filteredByYear)
            .sort((a, b) => parseInt(b) - parseInt(a))
            .map((year) => (
              <View key={year} style={styles.yearSection}>
                <Text style={styles.yearTitle}>{year}</Text>
                {filteredByYear[parseInt(year)].map((paper) => {
                  const quality = getQualityBadge(paper.quality_tier);
                  return (
                    <View
                      key={paper.id}
                      style={[
                        styles.paperCard,
                        paper.questions_extracted && styles.paperCardReady,
                      ]}
                    >
                      {paper.questions_extracted && (
                        <View style={styles.readyBadge}>
                          <Text style={styles.readyBadgeText}>🏅 READY</Text>
                        </View>
                      )}
                      <View style={styles.paperHeader}>
                        <View>
                          <Text style={styles.paperTitle}>
                            {paper.exam_series} - Paper {paper.paper_number}
                          </Text>
                          <View style={styles.paperMeta}>
                            <View style={[styles.tierBadge, { backgroundColor: quality.color }]}>
                              <Text style={styles.tierBadgeText}>
                                {quality.emoji} {quality.text}
                              </Text>
                            </View>
                            {paper.questions_extracted && (
                              <View style={styles.questionsCountPill}>
                                <Text style={styles.questionsCountText}>
                                  {paper.questions_count} Qs
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>

                      <View style={styles.paperActions}>
                        {paper.question_paper_url && (
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => openPDF(paper.question_paper_url!)}
                          >
                            <Icon name="document-text" size={16} color="#00F5FF" />
                            <Text style={styles.actionButtonText}>Question</Text>
                          </TouchableOpacity>
                        )}
                        {paper.mark_scheme_url && (
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => openPDF(paper.mark_scheme_url!)}
                          >
                            <Icon name="checkmark-circle" size={16} color="#10B981" />
                            <Text style={styles.actionButtonText}>Marks</Text>
                          </TouchableOpacity>
                        )}
                        {paper.examiner_report_url && (
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => openPDF(paper.examiner_report_url!)}
                          >
                            <Icon name="stats-chart" size={16} color="#F59E0B" />
                            <Text style={styles.actionButtonText}>Report</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.practiceButton,
                          paper.questions_extracted && styles.practiceButtonReady,
                        ]}
                        onPress={() => startPractice(paper)}
                      >
                        <Icon name="play-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.practiceButtonText}>
                          {paper.questions_extracted ? 'Practice (Ready)' : 'Practice Questions'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    marginRight: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 245, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.22)',
  },
  headerTextContainer: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  filterScroll: {
    marginBottom: 20,
  },
  filterChips: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: 'rgba(0, 245, 255, 0.2)',
    borderColor: '#00F5FF',
  },
  filterChipText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#00F5FF',
  },
  papersContainer: {
    paddingHorizontal: 20,
  },
  yearSection: {
    marginBottom: 24,
  },
  yearTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00F5FF',
    marginBottom: 12,
  },
  paperCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  paperCardReady: {
    borderColor: 'rgba(245, 158, 11, 0.95)',
    borderWidth: 2,
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
  },
  readyBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  readyBadgeText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  paperHeader: {
    marginBottom: 12,
  },
  paperTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  paperMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  questionsCountPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  questionsCountText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
  },
  paperActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '500',
  },
  practiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00F5FF',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  practiceButtonReady: {
    backgroundColor: '#F59E0B',
  },
  practiceButtonText: {
    color: '#0a0f1e',
    fontSize: 14,
    fontWeight: 'bold',
  },
});


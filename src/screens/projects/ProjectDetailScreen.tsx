import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { DFText, DFCard, DFBadge } from '../../components/common';
import { TransactionItem } from '../../components/transactions/TransactionItem';
import { Colors, Spacing, Radius } from '../../theme';
import { useProjectStore } from '../../store';
import {
  formatCurrency,
  formatDate,
  projectStatusLabel,
  projectStatusColor,
  projectTypeLabel,
} from '../../utils/format';

export const ProjectDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { selectedProject: project, isLoading, fetchOne } = useProjectStore();

  useEffect(() => {
    if (route.params?.id) fetchOne(route.params.id);
  }, [route.params?.id]);

  if (isLoading || !project) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.navy} size="large" />
      </View>
    );
  }

  // Garantindo ao TypeScript que project.status é uma chave válida
  const safeStatus = project.status as keyof typeof projectStatusColor;
  const safeType = project.type as keyof typeof projectTypeLabel;

  const statusColor = projectStatusColor[safeStatus] || Colors.gray;
  const pct = project.budget > 0 ? Math.min(((project.total_despesa || 0) / project.budget) * 100, 100) : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={Colors.navy} />
        </TouchableOpacity>
        <DFText variant="headline" weight="semibold" color={Colors.navy} style={{ flex: 1 }} numberOfLines={1}>
          {project.name}
        </DFText>
        <DFBadge label={projectStatusLabel[safeStatus] || 'Desconhecido'} color={statusColor} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Summary card */}
        <DFCard style={styles.summaryCard} shadow="md">
          <DFText variant="footnote" color={Colors.textSecondary}>Cliente</DFText>
          <DFText variant="headline" weight="semibold" color={Colors.navy} style={{ marginBottom: Spacing.sm }}>
            {project.client}
          </DFText>

          {project.address && (
            <>
              <DFText variant="footnote" color={Colors.textSecondary}>Endereço</DFText>
              <DFText variant="subheadline" color={Colors.textPrimary} style={{ marginBottom: Spacing.sm }}>
                {project.address}
              </DFText>
            </>
          )}

          <DFText variant="footnote" color={Colors.textSecondary}>Tipo de Obra</DFText>
          <DFText variant="subheadline" color={Colors.textPrimary} style={{ marginBottom: Spacing.md }}>
            {projectTypeLabel[safeType] || project.type}
          </DFText>

          <View style={styles.datesRow}>
            {project.start_date && (
              <View style={styles.dateItem}>
                <DFText variant="caption2" color={Colors.textTertiary}>Início</DFText>
                <DFText variant="footnote" weight="medium" color={Colors.textPrimary}>
                  {formatDate(project.start_date)}
                </DFText>
              </View>
            )}
            {project.estimated_end_date && (
              <View style={styles.dateItem}>
                <DFText variant="caption2" color={Colors.textTertiary}>Prev. Conclusão</DFText>
                <DFText variant="footnote" weight="medium" color={Colors.textPrimary}>
                  {formatDate(project.estimated_end_date)}
                </DFText>
              </View>
            )}
            {project.end_date && (
              <View style={styles.dateItem}>
                <DFText variant="caption2" color={Colors.textTertiary}>Concluído em</DFText>
                <DFText variant="footnote" weight="medium" color={Colors.success}>
                  {formatDate(project.end_date)}
                </DFText>
              </View>
            )}
          </View>
        </DFCard>

        {/* Financial summary */}
        <DFText variant="title3" weight="bold" color={Colors.navy} style={styles.sectionTitle}>
          Financeiro da Obra
        </DFText>
        <DFCard shadow="sm" style={styles.financialCard} padding={0}>
          <View style={styles.financialGrid}>
            <View style={styles.financialItem}>
              <DFText variant="caption2" color={Colors.textTertiary}>Orçamento</DFText>
              <DFText variant="headline" weight="bold" color={Colors.navy}>
                {formatCurrency(project.budget)}
              </DFText>
            </View>
            <View style={styles.financialItem}>
              <DFText variant="caption2" color={Colors.textTertiary}>Receitas</DFText>
              <DFText variant="headline" weight="bold" color={Colors.success}>
                {formatCurrency(project.total_receita || 0)}
              </DFText>
            </View>
            <View style={styles.financialItem}>
              <DFText variant="caption2" color={Colors.textTertiary}>Despesas</DFText>
              <DFText variant="headline" weight="bold" color={Colors.danger}>
                {formatCurrency(project.total_despesa || 0)}
              </DFText>
            </View>
            <View style={styles.financialItem}>
              <DFText variant="caption2" color={Colors.textTertiary}>Lucro</DFText>
              <DFText
                variant="headline"
                weight="bold"
                color={(project.lucro || 0) >= 0 ? Colors.success : Colors.danger}
              >
                {formatCurrency(project.lucro || 0)}
              </DFText>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <DFText variant="footnote" color={Colors.textSecondary}>
                Uso do orçamento
              </DFText>
              <DFText variant="footnote" weight="semibold" color={pct > 90 ? Colors.danger : Colors.orange}>
                {pct.toFixed(1)}%
              </DFText>
            </View>
            <View style={styles.progressBg}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${pct}%`, backgroundColor: pct > 90 ? Colors.danger : Colors.orange },
                ]}
              />
            </View>
          </View>
        </DFCard>

        {/* Transactions */}
        <View style={styles.txHeader}>
          <DFText variant="title3" weight="bold" color={Colors.navy}>Movimentações</DFText>
          <TouchableOpacity
            onPress={() => navigation.navigate('NovaTransação', { project_id: project.id })}
            activeOpacity={0.8}
          >
            <View style={styles.addTxBtn}>
              <Ionicons name="add" size={16} color={Colors.white} />
              <DFText variant="footnote" color={Colors.white} weight="semibold"> Adicionar</DFText>
            </View>
          </TouchableOpacity>
        </View>

        <DFCard shadow="sm" padding={0} style={styles.txCard}>
          {(project as any).transactions?.length === 0 ? (
            <View style={styles.emptyTx}>
              <DFText variant="subheadline" color={Colors.textTertiary} center>
                Nenhuma movimentação registrada.
              </DFText>
            </View>
          ) : (
            (project as any).transactions?.map((tx: any, i: number) => (
              <View key={tx.id ? String(tx.id) : String(i)}>
                <TransactionItem transaction={tx} showProject={false} />
                {i < (project as any).transactions.length - 1 && <View style={styles.separator} />}
              </View>
            ))
          )}
        </DFCard>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundPrimary },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  summaryCard: { marginBottom: Spacing.lg },
  datesRow: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap' },
  dateItem: { gap: 2 },
  sectionTitle: { marginBottom: Spacing.sm },
  financialCard: { marginBottom: Spacing.lg, overflow: 'hidden' },
  financialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.md,
    gap: 0,
  },
  financialItem: {
    width: '50%',
    padding: Spacing.sm,
    gap: 3,
  },
  progressSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.grayBackground,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressBg: {
    height: 6,
    backgroundColor: Colors.grayBackground,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  addTxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.orange,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    gap: 2,
  },
  txCard: { marginBottom: Spacing.lg },
  separator: {
    height: 1,
    backgroundColor: Colors.grayBackground,
    marginHorizontal: Spacing.md,
  },
  emptyTx: { padding: Spacing.xl, alignItems: 'center' },
});
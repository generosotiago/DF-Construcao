import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Searchbar, Chip } from 'react-native-paper';
import { DFText, DFCard, DFBadge, DFEmptyState } from '../../components/common';
import { Colors, Spacing, Radius } from '../../theme';
import { useProjectStore } from '../../store';
import { Project } from '../../types';
import { formatCurrency, projectStatusLabel, projectStatusColor, projectTypeLabel } from '../../utils/format';

const STATUS_FILTERS = [
  { key: '', label: 'Todos' },
  { key: 'em_andamento', label: 'Em Andamento' },
  { key: 'orcamento', label: 'Orçamento' },
  { key: 'concluido', label: 'Concluído' },
  { key: 'pausado', label: 'Pausado' },
];

const ProjectCard: React.FC<{ project: Project; onPress: () => void }> = ({ project, onPress }) => {
  // Garantindo a tipagem correta para evitar erros no map
  const safeStatus = project.status as keyof typeof projectStatusColor;
  const safeType = project.type as keyof typeof projectTypeLabel;

  const statusColor = projectStatusColor[safeStatus] || Colors.gray;
  const pct = project.budget > 0 ? Math.min(((project.total_despesa || 0) / project.budget) * 100, 100) : 0;

  return (
    <DFCard onPress={onPress} style={styles.projectCard} shadow="sm">
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleArea}>
          <DFText variant="headline" weight="semibold" color={Colors.navy} numberOfLines={1}>
            {project.name}
          </DFText>
          <DFText variant="caption1" color={Colors.textTertiary} numberOfLines={1}>
            {project.client}
          </DFText>
        </View>
        <DFBadge
          label={projectStatusLabel[safeStatus] || project.status}
          color={statusColor}
        />
      </View>

      <DFText variant="caption1" color={Colors.textTertiary} style={styles.typeTag}>
        {projectTypeLabel[safeType] || project.type}
      </DFText>

      {/* Budget progress */}
      <View style={styles.budgetSection}>
        <View style={styles.budgetRow}>
          <DFText variant="footnote" color={Colors.textSecondary}>Orçamento</DFText>
          <DFText variant="footnote" weight="semibold" color={Colors.navy}>
            {formatCurrency(project.budget)}
          </DFText>
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: pct > 90 ? Colors.danger : Colors.orange }]} />
        </View>
        <DFText variant="caption2" color={Colors.textTertiary}>{pct.toFixed(0)}% utilizado</DFText>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <DFText variant="caption2" color={Colors.textTertiary}>Receita</DFText>
          <DFText variant="footnote" weight="semibold" color={Colors.success}>
            {formatCurrency(project.total_receita || 0)}
          </DFText>
        </View>
        <View style={styles.footerDivider} />
        <View style={styles.footerItem}>
          <DFText variant="caption2" color={Colors.textTertiary}>Despesa</DFText>
          <DFText variant="footnote" weight="semibold" color={Colors.danger}>
            {formatCurrency(project.total_despesa || 0)}
          </DFText>
        </View>
        <View style={styles.footerDivider} />
        <View style={styles.footerItem}>
          <DFText variant="caption2" color={Colors.textTertiary}>Lucro</DFText>
          <DFText
            variant="footnote"
            weight="bold"
            color={(project.lucro || 0) >= 0 ? Colors.success : Colors.danger}
          >
            {formatCurrency(project.lucro || 0)}
          </DFText>
        </View>
      </View>
    </DFCard>
  );
};

export const ProjectsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { projects, isLoading, fetchAll } = useProjectStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchAll({ status: statusFilter || undefined, search: search || undefined });
  }, [statusFilter, search]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <DFText variant="title2" weight="bold" color={Colors.navy}>Obras</DFText>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('NovoProjeto')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <Searchbar
        placeholder="Buscar obra ou cliente..."
        value={search}
        onChangeText={setSearch}
        style={styles.searchbar}
        inputStyle={{ fontSize: 14, color: Colors.navy }}
        iconColor={Colors.grayLight}
      />

      <View style={styles.filters}>
        {STATUS_FILTERS.map((f) => (
          <Chip
            key={f.key}
            selected={statusFilter === f.key}
            onPress={() => setStatusFilter(f.key)}
            style={[styles.chip, statusFilter === f.key && styles.chipSelected]}
            textStyle={[styles.chipText, statusFilter === f.key && styles.chipTextSelected]}
            compact
          >
            {f.label}
          </Chip>
        ))}
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item, index) => item.id ? String(item.id) : String(index)}
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() => navigation.navigate('DetalheProjeto', { id: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => fetchAll()} tintColor={Colors.navy} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading ? (
            <DFEmptyState
              icon="construct-outline"
              title="Nenhuma obra encontrada"
              description="Comece cadastrando sua primeira obra."
              actionLabel="Nova Obra"
              onAction={() => navigation.navigate('NovoProjeto')}
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundPrimary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchbar: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    elevation: 0,
    borderWidth: 1.5,
    borderColor: Colors.grayBorder,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    flexWrap: 'nowrap',
  },
  chip: {
    backgroundColor: Colors.white,
    borderColor: Colors.grayBorder,
    borderWidth: 1,
  },
  chipSelected: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  chipText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.white,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  projectCard: {
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: Spacing.sm,
  },
  cardTitleArea: {
    flex: 1,
    gap: 2,
  },
  typeTag: {
    marginBottom: Spacing.sm,
  },
  budgetSection: {
    marginBottom: Spacing.sm,
    gap: 4,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressBg: {
    height: 4,
    backgroundColor: Colors.grayBackground,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.grayBackground,
    marginTop: Spacing.xs,
  },
  footerItem: {
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  footerDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.grayBackground,
  },
});
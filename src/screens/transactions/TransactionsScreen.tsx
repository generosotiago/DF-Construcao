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
import { Chip } from 'react-native-paper';
import { DFText, DFCard, DFEmptyState } from '../../components/common';
import { TransactionItem } from '../../components/transactions/TransactionItem';
import { Colors, Spacing } from '../../theme';
import { useTransactionStore } from '../../store';
import { formatCurrency } from '../../utils/format';
import { Transaction } from '../../types';

const TYPE_FILTERS = [
  { key: '', label: 'Todos' },
  { key: 'receita', label: 'Receitas' },
  { key: 'despesa', label: 'Despesas' },
];

export const TransactionsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { transactions, isLoading, fetchAll } = useTransactionStore();
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    fetchAll({ type: typeFilter || undefined });
  }, [typeFilter]);

  const totalReceita = transactions.filter((t) => t.type === 'receita').reduce((s, t) => s + Number(t.amount), 0);
  const totalDespesa = transactions.filter((t) => t.type === 'despesa').reduce((s, t) => s + Number(t.amount), 0);

  const renderItem = ({ item }: { item: Transaction }) => (
    <TransactionItem
      transaction={item}
      onPress={() => navigation.navigate('DetalheTransação', { id: item.id })}
    />
  );

  const renderSeparator = () => <View style={styles.separator} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <DFText variant="title2" weight="bold" color={Colors.navy}>Transações</DFText>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('NovaTransação', {})}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {!typeFilter && (
        <View style={styles.summaryRow}>
          <DFCard style={styles.summaryCard} padding={Spacing.md} shadow="sm">
            <View style={styles.summaryDot} />
            <DFText variant="caption2" color={Colors.textTertiary}>Receitas</DFText>
            <DFText variant="headline" weight="bold" color={Colors.success}>
              {formatCurrency(totalReceita, true)}
            </DFText>
          </DFCard>
          
          <DFCard style={styles.summaryCard} padding={Spacing.md} shadow="sm">
            <View style={[styles.summaryDot, { backgroundColor: Colors.danger }]} />
            <DFText variant="caption2" color={Colors.textTertiary}>Despesas</DFText>
            <DFText variant="headline" weight="bold" color={Colors.danger}>
              {formatCurrency(totalDespesa, true)}
            </DFText>
          </DFCard>

          <DFCard style={styles.summaryCard} padding={Spacing.md} shadow="sm">
            <View style={[styles.summaryDot, { backgroundColor: Colors.navy }]} />
            <DFText variant="caption2" color={Colors.textTertiary}>Saldo</DFText>
            <DFText
              variant="headline"
              weight="bold"
              color={(totalReceita - totalDespesa) >= 0 ? Colors.success : Colors.danger}
            >
              {formatCurrency(totalReceita - totalDespesa, true)}
            </DFText>
          </DFCard>
        </View>
      )}

      <View style={styles.filters}>
        {TYPE_FILTERS.map((f) => (
          <Chip
            key={f.key}
            selected={typeFilter === f.key}
            onPress={() => setTypeFilter(f.key)}
            style={[styles.chip, typeFilter === f.key && styles.chipSelected]}
            textStyle={[styles.chipText, typeFilter === f.key && styles.chipTextSelected]}
            compact
          >
            {f.label}
          </Chip>
        ))}
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={renderSeparator}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => fetchAll({ type: typeFilter || undefined })} tintColor={Colors.navy} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading ? (
            <DFEmptyState
              icon="swap-vertical-outline"
              title="Nenhuma transação"
              description="Registre receitas e despesas das suas obras."
              actionLabel="Nova Transação"
              onAction={() => navigation.navigate('NovaTransação', {})}
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
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  summaryCard: {
    flex: 1,
    gap: 3,
  },
  summaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
    marginBottom: 4,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
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
  chipText: { fontSize: 12, color: Colors.textSecondary },
  chipTextSelected: { color: Colors.white },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.grayBackground,
    marginLeft: 68,
  },
});
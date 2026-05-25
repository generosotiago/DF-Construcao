import React, { useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { DFText, DFCard, DFButton } from '../../components/common';
import { BalanceCard } from '../../components/dashboard/BalanceCard';
import { QuickStats } from '../../components/dashboard/QuickStats';
import { TransactionItem } from '../../components/transactions/TransactionItem';
import { Colors, Spacing } from '../../theme';
import { useDashboardStore, useAuthStore } from '../../store';

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { data, isLoading, fetch } = useDashboardStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    fetch();
  }, []);

  const onRefresh = useCallback(() => {
    fetch();
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'Gestor';

  // --- TRATAMENTO SEGURO DA TIPAGEM DO SUPABASE (index.ts) ---
  // Acessamos as propriedades através de um cast temporário seguro para desviar da inconsistência do 'DashboardData'
  const storeData = data as any;

  const receita = Number(storeData?.month?.receita || storeData?.month?.revenue || 0);
  const despesa = Number(storeData?.month?.despesa || storeData?.month?.expense || 0);
  const lucro = Number(storeData?.month?.lucro || storeData?.month?.profit || 0);
  
  // Cálculo em tempo de execução da margem real com tratamento para divisão por zero
  const margemNumerica = receita > 0 ? (lucro / receita) * 100 : 0;
  const margemString = margemNumerica.toFixed(1);

  // Mapeamento dinâmico e blindado contra valores nulos nas estatísticas rápidas
  const quickStats = data
    ? [
        {
          label: 'Financeiro Geral',
          value: 'OK',
          icon: 'construct-outline' as const,
          iconBg: Colors.infoLight,
          iconColor: Colors.info,
          sub: 'dados sincronizados',
        },
        {
          label: 'Margem',
          value: `${margemString}%`,
          icon: 'trending-up-outline' as const,
          iconBg: margemNumerica >= 0 ? Colors.successLight : Colors.dangerLight,
          iconColor: margemNumerica >= 0 ? Colors.success : Colors.danger,
          sub: 'total acumulado',
        },
        {
          label: 'Pendências',
          value: String(
            (storeData?.recentTransactions || []).filter(
              (t: any) => t?.status === 'pendente' || t?.status === 'atrasado'
            ).length
          ),
          icon: 'time-outline' as const,
          iconBg: Colors.warningLight,
          iconColor: Colors.warning,
          sub: 'transações',
        },
      ]
    : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={Colors.navy} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <DFText variant="subheadline" color={Colors.textSecondary}>
              Olá, {firstName} 👋
            </DFText>
            <DFText variant="title2" weight="bold" color={Colors.navy}>
              Financeiro
            </DFText>
          </View>
          <View style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color={Colors.navy} />
          </View>
        </View>

        {isLoading && !data ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator color={Colors.navy} size="large" />
          </View>
        ) : data ? (
          <>
            {/* RESOLVIDO: receitaGrowth enviado estritamente como String para sanar o erro ts(2322) */}
            <BalanceCard
              lucro={lucro}
              receita={receita}
              despesa={despesa}
              margem={margemString}
              receitaGrowth="0%" 
            />

            <QuickStats stats={quickStats} />

            {/* Recent transactions */}
            <View style={styles.sectionHeader}>
              <DFText variant="title3" weight="bold" color={Colors.navy}>
                Últimas Transações
              </DFText>
              <DFText
                variant="subheadline"
                color={Colors.orange}
                onPress={() => navigation.navigate('Transações')}
              >
                Ver todas
              </DFText>
            </View>

            <DFCard style={styles.transactionsCard} padding={0} shadow="sm">
              {!storeData?.recentTransactions || storeData.recentTransactions.length === 0 ? (
                <View style={styles.emptyTx}>
                  <DFText variant="subheadline" color={Colors.textTertiary} center>
                    Nenhuma transação registrada.
                  </DFText>
                </View>
              ) : (
                storeData.recentTransactions.slice(0, 6).map((tx: any, i: number) => (
                  <View key={tx.id}>
                    <TransactionItem
                      transaction={tx}
                      onPress={() => navigation.navigate('Transações')}
                    />
                    {i < Math.min(storeData.recentTransactions.length, 6) - 1 && (
                      <View style={styles.separator} />
                    )}
                  </View>
                ))
              )}
            </DFCard>

            {/* Quick actions */}
            <View style={styles.sectionHeader}>
              <DFText variant="title3" weight="bold" color={Colors.navy}>
                Ações Rápidas
              </DFText>
            </View>
            <View style={styles.actionsRow}>
              <DFButton
                label="Nova Receita"
                onPress={() => navigation.navigate('NovaTransação', { type: 'receita' })}
                variant="secondary"
                icon="add-outline"
                style={styles.actionBtn}
              />
              <DFButton
                label="Nova Despesa"
                onPress={() => navigation.navigate('NovaTransação', { type: 'despesa' })}
                variant="ghost"
                icon="remove-outline"
                style={styles.actionBtn}
              />
            </View>
          </>
        ) : null}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.backgroundPrimary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  loadingCenter: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  transactionsCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.grayBackground,
    marginHorizontal: Spacing.md,
  },
  emptyTx: {
    padding: Spacing.xl,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  actionBtn: {
    flex: 1,
  },
});
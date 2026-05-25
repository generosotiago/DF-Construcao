import React, { useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { DFText, DFCard } from '../../components/common';
import { Colors, Spacing, Radius } from '../../theme';
import { formatCurrency } from '../../utils/format';
import { useTransactionStore } from '../../store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md * 2;

export const ReportsScreen: React.FC = () => {
  const { transactions, fetchAll, isLoading } = useTransactionStore();

  useEffect(() => {
    fetchAll();
  }, []);

  const cashflow = useMemo(() => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    const months: Array<{
      month: string;
      receita: number;
      despesa: number;
      lucro: number;
      rawMonth: number;
      rawYear: number;
    }> = [];

    // Cria a grade vazia dos últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({
        month: `${monthNames[d.getMonth()]}/${d.getFullYear().toString().slice(-2)}`,
        receita: 0,
        despesa: 0,
        lucro: 0,
        rawMonth: d.getMonth(),
        rawYear: d.getFullYear()
      });
    }

    // Preenche com as transações da store conectada ao Supabase
    transactions.forEach(t => {
      if (!t.date && !t.createdAt) return;
      const d = new Date(t.date || t.createdAt);
      
      const target = months.find(m => m.rawMonth === d.getMonth() && m.rawYear === d.getFullYear());
      
      if (target) {
        const val = Number(t.amount) || 0;
        const tipo = String(t.type).toLowerCase();

        if (tipo === 'receita' || tipo === 'revenue') target.receita += val;
        else if (tipo === 'despesa' || tipo === 'expense') target.despesa += val;

        target.lucro = target.receita - target.despesa;
      }
    });

    return months;
  }, [transactions]);

  const categoryData = useMemo(() => {
    const catMap = new Map();
    const colors = ['#ef4444', '#f97316', '#eab308', '#06b6d4', '#8b5cf6'];

    transactions.forEach(t => {
      const tipo = String(t.type).toLowerCase();
      if (tipo === 'despesa' || tipo === 'expense') {
        const catName = t.category || (t as any).categoria || 'Geral';
        if (!catMap.has(catName)) {
          catMap.set(catName, { name: catName, total: 0, count: 0 });
        }
        catMap.get(catName).total += Number(t.amount) || 0;
        catMap.get(catName).count += 1;
      }
    });

    return Array.from(catMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((item, index) => ({
        category: { name: item.name, color: colors[index % colors.length] },
        total: String(item.total), 
        count: item.count
      }));
  }, [transactions]);

  const hasData = transactions.length > 0;

  const lineData = {
    labels: cashflow.map((c) => c.month),
    datasets: [
      {
        data: cashflow.map((c) => c.receita),
        color: () => Colors.success,
        strokeWidth: 2,
      },
      {
        data: cashflow.map((c) => c.despesa),
        color: () => Colors.danger,
        strokeWidth: 2,
      },
    ],
    legend: ['Receitas', 'Despesas'],
  };

  const lucroData = {
    labels: cashflow.map((c) => c.month),
    datasets: [
      {
        data: cashflow.map((c) => c.lucro),
      },
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: Colors.white,
    backgroundGradientTo: Colors.white,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(7, 28, 54, ${opacity})`,
    labelColor: () => Colors.textSecondary,
    style: { borderRadius: Radius.md },
    propsForDots: { r: '4', strokeWidth: '2', stroke: Colors.navy },
  };

  const totalReceita = cashflow.reduce((s, c) => s + c.receita, 0);
  const totalDespesa = cashflow.reduce((s, c) => s + c.despesa, 0);
  const totalLucro = cashflow.reduce((s, c) => s + c.lucro, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <DFText variant="title2" weight="bold" color={Colors.navy}>Relatórios</DFText>
        <DFText variant="footnote" color={Colors.textSecondary}>Últimos 6 meses</DFText>
      </View>

      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={Colors.navy} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchAll} tintColor={Colors.navy} />}
        >
          {/* Period summary */}
          <View style={styles.summaryRow}>
            <DFCard style={styles.summaryItem} shadow="sm">
              <View style={[styles.summaryIcon, { backgroundColor: Colors.successLight }]}>
                <DFText variant="headline">💰</DFText>
              </View>
              <DFText variant="caption2" color={Colors.textTertiary}>Total Receita</DFText>
              <DFText variant="callout" weight="bold" color={Colors.success}>
                {formatCurrency(totalReceita, true)}
              </DFText>
            </DFCard>
            <DFCard style={styles.summaryItem} shadow="sm">
              <View style={[styles.summaryIcon, { backgroundColor: Colors.dangerLight }]}>
                <DFText variant="headline">📦</DFText>
              </View>
              <DFText variant="caption2" color={Colors.textTertiary}>Total Despesa</DFText>
              <DFText variant="callout" weight="bold" color={Colors.danger}>
                {formatCurrency(totalDespesa, true)}
              </DFText>
            </DFCard>
            <DFCard style={styles.summaryItem} shadow="sm">
              <View style={[styles.summaryIcon, { backgroundColor: totalLucro >= 0 ? Colors.successLight : Colors.dangerLight }]}>
                <DFText variant="headline">📈</DFText>
              </View>
              <DFText variant="caption2" color={Colors.textTertiary}>Lucro Total</DFText>
              <DFText variant="callout" weight="bold" color={totalLucro >= 0 ? Colors.success : Colors.danger}>
                {formatCurrency(totalLucro, true)}
              </DFText>
            </DFCard>
          </View>

          {/* Line chart: Receita vs Despesa */}
          {hasData && (
            <DFCard shadow="sm" style={styles.chartCard}>
              <DFText variant="headline" weight="semibold" color={Colors.navy} style={styles.chartTitle}>
                Receitas vs Despesas
              </DFText>
              <DFText variant="caption1" color={Colors.textTertiary} style={styles.chartSubtitle}>
                Evolução dos últimos 6 meses
              </DFText>
              <LineChart
                data={lineData}
                width={CHART_WIDTH}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withShadow={false}
                withInnerLines={false}
                withOuterLines
                fromZero
              />
            </DFCard>
          )}

          {/* Bar chart: Lucro mensal */}
          {hasData && (
            <DFCard shadow="sm" style={styles.chartCard}>
              <DFText variant="headline" weight="semibold" color={Colors.navy} style={styles.chartTitle}>
                Lucro por Mês
              </DFText>
              <DFText variant="caption1" color={Colors.textTertiary} style={styles.chartSubtitle}>
                Resultado líquido mensal
              </DFText>
              <BarChart
                data={{
                  ...lucroData,
                  datasets: [{
                    data: cashflow.map((c) => Math.max(c.lucro, 0)),
                  }],
                }}
                width={CHART_WIDTH}
                height={180}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(249, 115, 22, ${opacity})`,
                }}
                style={styles.chart}
                withInnerLines={false}
                fromZero
                showValuesOnTopOfBars
                yAxisLabel="R$"
                yAxisSuffix=""
              />
            </DFCard>
          )}

          {/* Top expenses by category */}
          {categoryData.length > 0 && (
            <DFCard shadow="sm" style={styles.chartCard} padding={0}>
              <View style={styles.catHeader}>
                <DFText variant="headline" weight="semibold" color={Colors.navy}>
                  Top Categorias de Despesa
                </DFText>
                <DFText variant="caption1" color={Colors.textTertiary}>Este período</DFText>
              </View>
              {categoryData.map((item, i) => {
                const maxVal = Math.max(...categoryData.map((c) => parseFloat(c.total)));
                const pct = maxVal > 0 ? (parseFloat(item.total) / maxVal) * 100 : 0;
                return (
                  <View key={item.category?.name || i} style={styles.catItem}>
                    <View style={[styles.catDot, { backgroundColor: item.category?.color || Colors.gray }]} />
                    <View style={styles.catInfo}>
                      <View style={styles.catRow}>
                        <DFText variant="subheadline" weight="medium" color={Colors.textPrimary} numberOfLines={1} style={{ flex: 1 }}>
                          {item.category?.name || 'Sem categoria'}
                        </DFText>
                        <DFText variant="subheadline" weight="semibold" color={Colors.danger}>
                          {formatCurrency(parseFloat(item.total))}
                        </DFText>
                      </View>
                      <View style={styles.catProgressBg}>
                        <View style={[styles.catProgressFill, { width: `${pct}%`, backgroundColor: item.category?.color || Colors.gray }]} />
                      </View>
                    </View>
                  </View>
                );
              })}
            </DFCard>
          )}

          {/* Monthly table */}
          {hasData && (
            <DFCard shadow="sm" style={styles.chartCard} padding={0}>
              <View style={styles.tableHeader}>
                <DFText variant="footnote" weight="semibold" color={Colors.textTertiary} style={{ flex: 1 }}>MÊS</DFText>
                <DFText variant="footnote" weight="semibold" color={Colors.textTertiary} style={styles.tableCol}>RECEITA</DFText>
                <DFText variant="footnote" weight="semibold" color={Colors.textTertiary} style={styles.tableCol}>DESPESA</DFText>
                <DFText variant="footnote" weight="semibold" color={Colors.textTertiary} style={styles.tableCol}>LUCRO</DFText>
              </View>
              {[...cashflow].reverse().map((c, i) => (
                <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                  <DFText variant="footnote" color={Colors.textSecondary} style={{ flex: 1 }}>{c.month}</DFText>
                  <DFText variant="footnote" weight="medium" color={Colors.success} style={styles.tableCol}>
                    {formatCurrency(c.receita, true)}
                  </DFText>
                  <DFText variant="footnote" weight="medium" color={Colors.danger} style={styles.tableCol}>
                    {formatCurrency(c.despesa, true)}
                  </DFText>
                  <DFText
                    variant="footnote"
                    weight="bold"
                    color={c.lucro >= 0 ? Colors.success : Colors.danger}
                    style={styles.tableCol}
                  >
                    {formatCurrency(c.lucro, true)}
                  </DFText>
                </View>
              ))}
            </DFCard>
          )}

          <View style={{ height: Spacing.xl }} />
        </ScrollView>
      )}
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
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  summaryItem: { flex: 1, gap: 4 },
  summaryIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  chartCard: { marginBottom: Spacing.md },
  chartTitle: { marginBottom: 4 },
  chartSubtitle: { marginBottom: Spacing.md },
  chart: { borderRadius: Radius.md, marginLeft: -Spacing.sm },
  catHeader: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayBackground,
    gap: 2,
  },
  catItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catInfo: { flex: 1, gap: 4 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catProgressBg: { height: 4, backgroundColor: Colors.grayBackground, borderRadius: 2, overflow: 'hidden' },
  catProgressFill: { height: '100%', borderRadius: 2 },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayBackground,
    backgroundColor: Colors.grayBackground,
  },
  tableRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: 10 },
  tableRowAlt: { backgroundColor: Colors.grayBackground + '40' },
  tableCol: { width: 75, textAlign: 'right' },
});
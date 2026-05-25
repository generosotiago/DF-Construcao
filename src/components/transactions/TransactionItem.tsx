import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DFText } from '../common/DFText';
import { Colors, Spacing } from '../../theme';
import { Transaction } from '../../types';
import { formatCurrency, formatDate, transactionStatusColor } from '../../utils/format';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
  showProject?: boolean;
}

// Mapeia nomes textuais de categorias para os ícones equivalentes do Ionicons
const categoryIconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Alvenaria': 'construct-outline',
  'Fundação': 'build-outline',
  'Reboco': 'brush-outline',
  'Material': 'cube-outline',
  'Mão de Obra': 'people-outline',
  'Transporte': 'car-outline',
  'Alimentação': 'cafe-outline',
  'Geral': 'ellipse-outline',
};

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onPress,
  showProject = true,
}) => {
  const isReceita = transaction.type === 'receita';
  const amountColor = isReceita ? Colors.success : Colors.danger;
  
  // Tratamento seguro do status para evitar quebras de cores
  const currentStatus = (transaction.status || 'pago').toLowerCase();
  const statusColor = (transactionStatusColor as any)[currentStatus] || Colors.gray;

  // Resolve o ícone baseado no nome textual da categoria ou no tipo da transação
  const categoryName = typeof transaction.category === 'string' ? transaction.category : 'Geral';
  const iconName = categoryIconMap[categoryName] || (isReceita ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline');

  const iconBg = isReceita ? Colors.successLight : Colors.dangerLight;
  const iconColor = isReceita ? Colors.success : Colors.danger;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.container}
    >
      <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={20} color={iconColor} />
      </View>

      <View style={styles.info}>
        <DFText variant="subheadline" weight="medium" color={Colors.textPrimary} numberOfLines={1}>
          {transaction.description || 'Transação sem descrição'}
        </DFText>
        <View style={styles.metaRow}>
          <DFText variant="caption1" color={Colors.textTertiary}>
            {formatDate(transaction.date)}
          </DFText>
          <View style={styles.dot} />
          <DFText variant="caption1" color={Colors.textTertiary} numberOfLines={1}>
            {categoryName}
          </DFText>
          {showProject && transaction.project_id && (
            <>
              <View style={styles.dot} />
              <DFText variant="caption1" color={Colors.orange} numberOfLines={1}>
                Obra #{transaction.project_id}
              </DFText>
            </>
          )}
        </View>
      </View>

      <View style={styles.right}>
        <DFText
          variant="subheadline"
          weight="semibold"
          color={amountColor}
        >
          {isReceita ? '+' : '-'} {formatCurrency(Number(transaction.amount))}
        </DFText>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.textDisabled,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    alignSelf: 'center',
  },
});
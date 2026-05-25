import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Menu } from 'react-native-paper';
import { DFText, DFInput, DFButton } from '../../components/common';
import { Colors, Spacing, Radius } from '../../theme';
import { useTransactionStore, useCategoryStore, useProjectStore, useDashboardStore } from '../../store';
import { paymentMethodLabel } from '../../utils/format';

const PAYMENT_METHODS = Object.entries(paymentMethodLabel);
const STATUS_OPTIONS: [string, string][] = [
  ['pago', 'Pago'],
  ['pendente', 'Pendente'],
  ['atrasado', 'Atrasado'],
  ['cancelado', 'Cancelado'],
];

interface SelectFieldProps {
  label: string;
  value: string;
  options: [string, string][];
  onSelect: (val: string) => void;
  placeholder?: string;
}

const SelectField: React.FC<SelectFieldProps> = ({ label, value, options, onSelect, placeholder }) => {
  const [visible, setVisible] = useState(false);
  const selected = options.find(([k]) => k === value);

  return (
    <View style={sf.container}>
      <DFText variant="subheadline" weight="medium" color={Colors.textSecondary} style={sf.label}>{label}</DFText>
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchor={
          <TouchableOpacity style={sf.selector} onPress={() => setVisible(true)} activeOpacity={0.8}>
            <DFText variant="body" color={selected ? Colors.textPrimary : Colors.textDisabled}>
              {selected ? selected[1] : (placeholder || 'Selecionar...')}
            </DFText>
            <Ionicons name="chevron-down" size={16} color={Colors.grayLight} />
          </TouchableOpacity>
        }
      >
        {options.map(([k, v]) => (
          <Menu.Item 
            key={k} 
            onPress={() => { onSelect(k); setVisible(false); }} 
            title={v}
            titleStyle={{ color: value === k ? Colors.navy : Colors.textPrimary }} 
          />
        ))}
      </Menu>
    </View>
  );
};

const sf = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: { marginBottom: 6 },
  selector: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.grayBorder,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, height: 48,
  },
});

export const NewTransactionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { create } = useTransactionStore();
  const { categories, fetchAll: fetchCategories } = useCategoryStore();
  const { projects, fetchAll: fetchProjects } = useProjectStore();
  const { fetch: refreshDashboard } = useDashboardStore();
  const [loading, setLoading] = useState(false);

  const initialType = route.params?.type || 'despesa';

  const [form, setForm] = useState({
    type: initialType as 'receita' | 'despesa',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'pix',
    status: 'pago',
    category: 'Geral', // Guardamos o nome do texto diretamente alinhado à store
    project_id: route.params?.project_id ? String(route.params.project_id) : '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCategories({ type: form.type });
    fetchProjects();
  }, [form.type]);

  const set = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.amount || isNaN(parseFloat(form.amount.replace(',', '.')))) e.amount = 'Informe o valor.';
    if (!form.description.trim()) e.description = 'Descrição é obrigatória.';
    if (!form.date) e.date = 'Informe a data.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        type: form.type,
        amount: parseFloat(form.amount.replace(',', '.')),
        description: form.description,
        date: form.date,
        payment_method: form.payment_method,
        status: form.status,
        category: form.category || 'Geral',
        project_id: form.project_id || undefined,
        notes: form.notes || undefined,
      };
      
      await create(payload);
      refreshDashboard();
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível registrar a transação.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === form.type);
  const categoryOptions: [string, string][] = [['Geral', 'Geral'], ...filteredCategories.map((c) => [c.name, c.name] as [string, string])];
  const projectOptions: [string, string][] = [['', 'Nenhuma obra'], ...projects.map((p) => [p.id, p.name] as [string, string])];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.navy} />
        </TouchableOpacity>
        <DFText variant="headline" weight="semibold" color={Colors.navy}>Nova Transação</DFText>
        <View style={{ width: 36 }} />
      </View>

      {/* Type toggle */}
      <View style={styles.typeToggle}>
        <TouchableOpacity
          style={[styles.typeBtn, form.type === 'receita' && styles.typeBtnActiveReceita]}
          onPress={() => set('type', 'receita')}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-down-circle-outline" size={16} color={form.type === 'receita' ? Colors.white : Colors.success} />
          <DFText variant="subheadline" weight="semibold" color={form.type === 'receita' ? Colors.white : Colors.success}>
            Receita
          </DFText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeBtn, form.type === 'despesa' && styles.typeBtnActiveDespesa]}
          onPress={() => set('type', 'despesa')}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-up-circle-outline" size={16} color={form.type === 'despesa' ? Colors.white : Colors.danger} />
          <DFText variant="subheadline" weight="semibold" color={form.type === 'despesa' ? Colors.white : Colors.danger}>
            Despesa
          </DFText>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <DFInput
            label="Valor (R$) *"
            value={form.amount}
            onChangeText={(v) => set('amount', v)}
            keyboardType="decimal-pad"
            placeholder="0,00"
            leftIcon="cash-outline"
            error={errors.amount}
          />

          <DFInput
            label="Descrição *"
            value={form.description}
            onChangeText={(v) => set('description', v)}
            placeholder="Ex: Cimento e areia"
            leftIcon="document-text-outline"
            error={errors.description}
          />

          <DFInput
            label="Data *"
            value={form.date}
            onChangeText={(v) => set('date', v)}
            placeholder="AAAA-MM-DD"
            leftIcon="calendar-outline"
            error={errors.date}
          />

          <SelectField label="Forma de Pagamento" value={form.payment_method} options={PAYMENT_METHODS} onSelect={(v) => set('payment_method', v)} />
          <SelectField label="Status" value={form.status} options={STATUS_OPTIONS} onSelect={(v) => set('status', v)} />
          <SelectField label="Categoria" value={form.category} options={categoryOptions} onSelect={(v) => set('category', v)} placeholder="Geral" />
          <SelectField label="Obra" value={form.project_id} options={projectOptions} onSelect={(v) => set('project_id', v)} placeholder="Nenhuma obra" />

          <DFInput
            label="Observações"
            value={form.notes}
            onChangeText={(v) => set('notes', v)}
            placeholder="Observações adicionais..."
            multiline
            numberOfLines={3}
            leftIcon="chatbubble-outline"
          />

          <DFButton
            label={`Registrar ${form.type === 'receita' ? 'Receita' : 'Despesa'}`}
            onPress={handleSubmit}
            loading={loading}
            fullWidth
            size="lg"
            variant={form.type === 'receita' ? 'primary' : 'danger'}
            style={{ marginTop: Spacing.sm }}
          />
          <View style={{ height: Spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundPrimary },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  typeToggle: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.grayBorder,
    overflow: 'hidden',
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: 12,
  },
  typeBtnActiveReceita: {
    backgroundColor: Colors.success,
  },
  typeBtnActiveDespesa: {
    backgroundColor: Colors.danger,
  },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
});
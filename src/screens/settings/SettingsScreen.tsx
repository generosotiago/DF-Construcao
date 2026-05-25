import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DFText, DFCard } from '../../components/common';
import { Colors, Spacing, Radius } from '../../theme';
import { useAuthStore } from '../../store';

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
  destructive?: boolean;
  rightElement?: React.ReactNode;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon, iconBg, iconColor, label, value, onPress, showArrow = true, destructive = false, rightElement,
}) => (
  <TouchableOpacity style={styles.settingItem} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
    <View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={16} color={iconColor} />
    </View>
    <View style={styles.settingInfo}>
      <DFText variant="subheadline" color={destructive ? Colors.danger : Colors.textPrimary}>
        {label}
      </DFText>
    </View>
    {value && (
      <DFText variant="subheadline" color={Colors.textTertiary} style={styles.settingValue}>
        {value}
      </DFText>
    )}
    {rightElement}
    {showArrow && !rightElement && <Ionicons name="chevron-forward" size={16} color={Colors.textDisabled} />}
  </TouchableOpacity>
);

export const SettingsScreen: React.FC = () => {
  const { user, logout, updateUser } = useAuthStore();

  // Estados dos modais e preferências locais
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: logout },
      ]
    );
  };

  const openEditProfile = () => {
    setEditName(user?.name || '');
    setEditEmail(user?.email || '');
    setEditProfileVisible(true);
  };

  const saveProfile = async () => {
    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim();

    if (!trimmedName) {
      Alert.alert('Nome inválido', 'O nome não pode ficar em branco.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('Email inválido', 'Informe um email válido.');
      return;
    }

    try {
      setSavingProfile(true);
      await updateUser({ name: trimmedName, email: trimmedEmail });
      setEditProfileVisible(false);
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso.');
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível atualizar o perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Alterar Senha',
      'A alteração de senha estará disponível em breve. Por enquanto, entre em contato com o administrador do sistema.',
      [{ text: 'OK' }]
    );
  };

  const handleNotificationsToggle = (value: boolean) => {
    setNotificationsEnabled(value);
    Alert.alert(
      'Notificações',
      value
        ? 'Notificações ativadas. Você receberá alertas sobre novas transações e atualizações.'
        : 'Notificações desativadas.',
      [{ text: 'OK' }]
    );
  };

  const handleTheme = () => {
    Alert.alert(
      'Tema',
      'O tema escuro será adicionado em uma futura atualização. O app está usando o tema Claro.',
      [{ text: 'OK' }]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'Sobre o App',
      'DF Construções\nVersão 1.0.0\n\nAplicativo de gestão financeira de obras desenvolvido para a DF Construções de Jaraguá do Sul / SC.',
      [{ text: 'OK' }]
    );
  };

  const initials = user?.name
    ?.split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'DF';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <DFText variant="title2" weight="bold" color={Colors.navy}>Configurações</DFText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Profile card */}
        <DFCard style={styles.profileCard} shadow="md">
          <View style={styles.avatarCircle}>
            <DFText variant="title2" weight="bold" color={Colors.white}>{initials}</DFText>
          </View>
          <View style={styles.profileInfo}>
            <DFText variant="headline" weight="bold" color={Colors.navy}>{user?.name}</DFText>
            <DFText variant="subheadline" color={Colors.textSecondary}>{user?.email}</DFText>
            <View style={styles.roleBadge}>
              <DFText variant="caption2" color={Colors.orange} weight="semibold">
                {user?.role === 'admin' ? 'Administrador' : user?.role === 'manager' ? 'Gestor' : 'Visualizador'}
              </DFText>
            </View>
          </View>
        </DFCard>

        {/* Company section */}
        <DFText variant="footnote" weight="semibold" color={Colors.textTertiary} style={styles.sectionLabel}>
          EMPRESA
        </DFText>
        <DFCard style={styles.groupCard} padding={0} shadow="sm">
          <SettingItem
            icon="business-outline"
            iconBg={Colors.infoLight}
            iconColor={Colors.info}
            label="DF Construções"
            value="Jaraguá do Sul / SC"
            showArrow={false}
          />
          <View style={styles.itemDivider} />
          <SettingItem
            icon="call-outline"
            iconBg={Colors.successLight}
            iconColor={Colors.success}
            label="Contato"
            value="(47) 99888-1234"
            showArrow={false}
          />
          <View style={styles.itemDivider} />
          <SettingItem
            icon="logo-instagram"
            iconBg="#f3e8ff"
            iconColor="#a855f7"
            label="Instagram"
            value="@dfconstrucoesjs"
            showArrow={false}
          />
        </DFCard>

        {/* Account section */}
        <DFText variant="footnote" weight="semibold" color={Colors.textTertiary} style={styles.sectionLabel}>
          CONTA
        </DFText>
        <DFCard style={styles.groupCard} padding={0} shadow="sm">
          <SettingItem
            icon="person-outline"
            iconBg={Colors.orangeLight}
            iconColor={Colors.orange}
            label="Editar Perfil"
            onPress={openEditProfile}
          />
          <View style={styles.itemDivider} />
          <SettingItem
            icon="lock-closed-outline"
            iconBg={Colors.infoLight}
            iconColor={Colors.info}
            label="Alterar Senha"
            onPress={handleChangePassword}
          />
        </DFCard>

        {/* App section */}
        <DFText variant="footnote" weight="semibold" color={Colors.textTertiary} style={styles.sectionLabel}>
          APLICATIVO
        </DFText>
        <DFCard style={styles.groupCard} padding={0} shadow="sm">
          <SettingItem
            icon="notifications-outline"
            iconBg={Colors.warningLight}
            iconColor={Colors.warning}
            label="Notificações"
            showArrow={false}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationsToggle}
                trackColor={{ false: Colors.grayBackground, true: Colors.orangeLight }}
                thumbColor={notificationsEnabled ? Colors.orange : Colors.gray}
              />
            }
          />
          <View style={styles.itemDivider} />
          <SettingItem
            icon="color-palette-outline"
            iconBg={Colors.grayBackground}
            iconColor={Colors.gray}
            label="Tema"
            value="Claro"
            onPress={handleTheme}
          />
          <View style={styles.itemDivider} />
          <SettingItem
            icon="information-circle-outline"
            iconBg={Colors.grayBackground}
            iconColor={Colors.gray}
            label="Sobre o App"
            value="v1.0.0"
            onPress={handleAbout}
          />
        </DFCard>

        {/* Logout */}
        <DFCard style={[styles.groupCard, { marginTop: Spacing.sm }]} padding={0} shadow="sm">
          <SettingItem
            icon="log-out-outline"
            iconBg={Colors.dangerLight}
            iconColor={Colors.danger}
            label="Sair da Conta"
            onPress={handleLogout}
            destructive
          />
        </DFCard>

        {/* Footer */}
        <View style={styles.footer}>
          <DFText variant="caption2" color={Colors.textDisabled} center>
            DF Construções © 2026
          </DFText>
          <DFText variant="caption2" color={Colors.textDisabled} center>
            Estruturas Fortes, Construção Confiável.
          </DFText>
        </View>
      </ScrollView>

      {/* Modal: Editar Perfil */}
      <Modal
        visible={editProfileVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditProfileVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <DFText variant="headline" weight="bold" color={Colors.navy}>
                Editar Perfil
              </DFText>
              <TouchableOpacity onPress={() => setEditProfileVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <DFText variant="footnote" weight="semibold" color={Colors.textSecondary}>
                Nome
              </DFText>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Seu nome"
                placeholderTextColor={Colors.textDisabled}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.field}>
              <DFText variant="footnote" weight="semibold" color={Colors.textSecondary}>
                Email
              </DFText>
              <TextInput
                style={styles.input}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="seu@email.com"
                placeholderTextColor={Colors.textDisabled}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditProfileVisible(false)}
                disabled={savingProfile}
              >
                <DFText variant="subheadline" weight="semibold" color={Colors.textSecondary}>
                  Cancelar
                </DFText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, savingProfile && { opacity: 0.6 }]}
                onPress={saveProfile}
                disabled={savingProfile}
              >
                <DFText variant="subheadline" weight="semibold" color={Colors.white}>
                  {savingProfile ? 'Salvando...' : 'Salvar'}
                </DFText>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundPrimary },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  content: { paddingHorizontal: Spacing.lg },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: { flex: 1, gap: 3 },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.orangeLight,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 3,
  },
  sectionLabel: {
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
    letterSpacing: 0.5,
  },
  groupCard: { marginBottom: Spacing.sm, overflow: 'hidden' },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    gap: Spacing.sm,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: { flex: 1 },
  settingValue: { marginRight: 4 },
  itemDivider: {
    height: 1,
    backgroundColor: Colors.grayBackground,
    marginLeft: 56,
  },
  footer: {
    paddingVertical: Spacing.xl,
    gap: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  field: { gap: 6 },
  input: {
    borderWidth: 1,
    borderColor: Colors.grayBackground,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.backgroundPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.grayBackground,
  },
  saveButton: {
    backgroundColor: Colors.orange,
  },
});

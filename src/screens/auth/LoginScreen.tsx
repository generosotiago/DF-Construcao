import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { DFText, DFButton, DFInput } from '../../components/common';
import { Colors, Spacing, Radius } from '../../theme';
import { useAuthStore } from '../../store';
import { Ionicons } from '@expo/vector-icons';

// Biblioteca para criptografar a senha no dispositivo
import CryptoJS from 'crypto-js';

// Conexão centralizada do Supabase
import { supabase } from '../../services/supabaseClient'; 

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = '735071305838-t06qvvaqhjf9o2sbtcae0ogk2npo6jj0.apps.googleusercontent.com';
const REDIRECT_URI = `https://auth.expo.io/@generosotiago/df-construcoes`;

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState(''); // Estado para armazenar o nome no cadastro
  const [isSignUp, setIsSignUp] = useState(false); // Controla se exibe Login (false) ou Cadastro (true)
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const setSessionUser = useAuthStore((s) => s.login);

  const discovery = AuthSession.useAutoDiscovery('https://accounts.google.com');

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_WEB_CLIENT_ID,
      redirectUri: REDIRECT_URI,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    discovery
  );

  React.useEffect(() => {
    if (response?.type === 'success' && response.params?.code) {
      handleGoogleCode(response.params.code, request?.codeVerifier);
    }
  }, [response]);

  const handleGoogleCode = async (code: string, codeVerifier?: string) => {
    setGoogleLoading(true);
    try {
      Alert.alert('Google Auth', 'Integração Google mantida.');
    } catch (err: any) {
      Alert.alert('Erro Google', err?.response?.data?.message || 'Falha na autenticação com Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const validate = () => {
    const e: typeof errors = {};
    const emailVal = email.trim();
    
    if (isSignUp && !nome.trim()) {
      e.name = 'Informe o seu nome.';
    }

    if (!emailVal) {
      e.email = 'Informe o e-mail.';
    } else if (!/\S+@\S+\.\S+/.test(emailVal)) {
      e.email = 'E-mail inválido.';
    }

    if (!password.trim()) {
      e.password = 'Informe a senha.';
    } else if (password.length < 6) {
      e.password = 'Mínimo 6 caracteres.';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Função para criptografar a string da senha
  const gerarHashSenha = (senhaLimpa: string) => {
    return CryptoJS.SHA256(senhaLimpa).toString();
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setErrors({}); // Limpa erros anteriores ao tentar novamente

    const emailFormatado = email.trim().toLowerCase();
    const senhaCriptografada = gerarHashSenha(password);

    try {
      if (isSignUp) {
        // --- PROCESSO DE CADASTRO ---
        
        // 1. Verifica duplicidade de e-mail
        const { data: usuarioExistente, error: fetchError } = await supabase
          .from('usuarios')
          .select('email')
          .eq('email', emailFormatado)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (usuarioExistente) {
          // Exibe o erro específico direto no input de e-mail
          setErrors({ email: 'Este e-mail já está cadastrado no sistema.' });
          setLoading(false);
          return;
        }

        // 2. Insere na tabela 'usuarios'
        const { error: insertError } = await supabase
          .from('usuarios')
          .insert([
            { nome: nome.trim(), email: emailFormatado, senha: senhaCriptografada }
          ]);

        if (insertError) throw insertError;

        Alert.alert('Sucesso!', 'Sua conta foi criada! Faça o login agora.');
        setIsSignUp(false);
        setPassword('');
        setNome('');
        
      } else {
        // --- PROCESSO DE LOGIN NO SUPABASE ---
        const { data, error } = await supabase
          .from('usuarios')
          .select('id, nome, email')
          .eq('email', emailFormatado)
          .eq('senha', senhaCriptografada)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          // Erro específico de credenciais incorretas
          setErrors({
            email: 'E-mail ou senha incorretos.',
            password: 'E-mail ou senha incorretos.'
          });
        } else {
          Alert.alert('Bem-vindo', `Olá, ${data.nome}!`);
          
          // Enviando o objeto formatado com os dados vindos do Supabase
          await setSessionUser({ nome: data.nome, email: data.email }, 'sessao_ativa'); 
        }
      }
    } catch (err: any) {
      // O ERRO ESTAVA AQUI: Esta parte precisa ficar dentro do CATCH!
      console.error('Erro detalhado:', err);
      setErrors({
        email: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoArea}>
            <View style={styles.logoBg}>
              <DFText variant="largeTitle" color={Colors.white} weight="extrabold">DF</DFText>
            </View>
            <DFText variant="title2" weight="bold" color={Colors.navy} style={styles.brandName}>
              DF Construções
            </DFText>
            <DFText variant="subheadline" color={Colors.textSecondary} center>
              Financeiro Inteligente
            </DFText>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <DFText variant="title3" weight="bold" color={Colors.navy} style={styles.formTitle}>
              {isSignUp ? 'Criar Conta' : 'Entrar'}
            </DFText>
            <DFText variant="subheadline" color={Colors.textSecondary} style={styles.formSubtitle}>
              {isSignUp ? 'Preencha os campos abaixo para começar' : 'Acesse sua conta para continuar'}
            </DFText>

            {/* CAMPO DINÂMICO DE NOME: Aparece apenas se clicar em "Cadastre-se" */}
            {isSignUp && (
              <DFInput
                label="Nome Completo"
                value={nome}
                onChangeText={setNome}
                autoCapitalize="words"
                leftIcon="person-outline"
                error={errors.name}
                placeholder="Seu nome completo"
              />
            )}

            <DFInput
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon="mail-outline"
              error={errors.email}
              placeholder="seu@email.com"
            />

            <DFInput
              label="Senha"
              value={password}
              onChangeText={setPassword}
              isPassword
              leftIcon="lock-closed-outline"
              error={errors.password}
              placeholder="Mínimo 6 caracteres"
            />

            <DFButton
              label={isSignUp ? 'Cadastrar Minha Conta' : 'Entrar'}
              onPress={handleSubmit}
              loading={loading}
              fullWidth
              size="lg"
              style={styles.loginBtn}
            />

            {/* Botão de Alternância de modo */}
            <TouchableOpacity 
              onPress={() => {
                setIsSignUp(!isSignUp);
                setErrors({}); // Limpa erros residuais de validação
              }}
              style={styles.toggleModeBtn}
            >
              <DFText variant="subheadline" color={Colors.orange} center>
                {isSignUp ? 'Já possui cadastro? Entre por aqui' : 'Não tem uma conta? Cadastre-se'}
              </DFText>
            </TouchableOpacity>

            {/* Divisores e Login Social (Escondidos ao cadastrar para limpar a UI) */}
            {!isSignUp && (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <DFText variant="caption1" color={Colors.textTertiary} style={styles.dividerText}>
                    ou continue com
                  </DFText>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={[styles.googleBtn, (googleLoading || !request) && styles.googleBtnDisabled]}
                  onPress={() => promptAsync()}
                  disabled={googleLoading || !request}
                  activeOpacity={0.8}
                >
                  <View style={styles.googleIconWrapper}>
                    <DFText style={styles.googleG}>G</DFText>
                  </View>
                  <DFText variant="subheadline" weight="semibold" color={Colors.textPrimary}>
                    {googleLoading ? 'Conectando...' : 'Continuar com Google'}
                  </DFText>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <DFText variant="caption1" color={Colors.textTertiary} center>
              Estruturas Fortes, Construção Confiável.
            </DFText>
            <DFText variant="caption2" color={Colors.textDisabled} center style={{ marginTop: 4 }}>
              v1.0.0 · Jaraguá do Sul / SC
            </DFText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundPrimary },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    justifyContent: 'center',
  },
  logoArea: { alignItems: 'center', marginBottom: Spacing.lg },
  logoBg: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    elevation: 4,
  },
  brandName: { marginBottom: 2 },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    elevation: 3,
    marginBottom: Spacing.md,
  },
  formTitle: { marginBottom: 4 },
  formSubtitle: { marginBottom: Spacing.md },
  loginBtn: { marginTop: Spacing.sm },
  toggleModeBtn: {
    marginTop: Spacing.md,
    paddingVertical: 4,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
    gap: Spacing.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.grayBorder },
  dividerText: { paddingHorizontal: 4 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.grayBorder,
    backgroundColor: Colors.white,
  },
  googleBtnDisabled: { opacity: 0.5 },
  googleIconWrapper: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    borderRadius: 4,
  },
  googleG: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  footer: { alignItems: 'center', paddingTop: Spacing.sm },
});
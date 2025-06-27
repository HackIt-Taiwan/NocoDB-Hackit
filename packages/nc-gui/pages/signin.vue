<script setup lang="ts">
import type { RuleObject } from 'ant-design-vue/es/form'

definePageMeta({
  requiresAuth: false,
  title: 'title.headLogin',
})

const route = useRoute()

const { signIn: _signIn, appInfo } = useGlobal()

// Check if only HackIt SSO is enabled, redirect directly
if (process.client) {
  watchEffect(() => {
    if (
      appInfo.value.hackitAuthEnabled && 
      appInfo.value.disableEmailAuth && 
      !appInfo.value.googleAuthEnabled &&
      !appInfo.value.oidcAuthEnabled &&
      !appInfo.value.samlAuthEnabled
    ) {
      // Store the continue path
      if (route.query?.continueAfterSignIn) {
        localStorage.setItem('continueAfterSignIn', route.query.continueAfterSignIn as string)
      }
      // Redirect directly to HackIt SSO
      window.location.href = `${appInfo.value.ncSiteUrl}/auth/hackit?state=hackit`
    }
  })
}

const { api, isLoading, error } = useApi({ useGlobalInstance: true })

const { t } = useI18n()

useSidebar('nc-left-sidebar', { hasSidebar: false })

const formValidator = ref()

const form = reactive({
  email: '',
  password: '',
})

const formRules: Record<string, RuleObject[]> = {
  email: [
    // E-mail is required
    { required: true, message: t('msg.error.signUpRules.emailRequired') },
    // E-mail must be valid format
    {
      validator: (_: unknown, v: string) => {
        return new Promise((resolve, reject) => {
          if (!v?.length || validateEmail(v.trim())) return resolve()

          reject(new Error(t('msg.error.signUpRules.emailInvalid')))
        })
      },
      message: t('msg.error.signUpRules.emailInvalid'),
    },
  ],
  password: [
    // Password is required
    { required: true, message: t('msg.error.signUpRules.passwdRequired') },
  ],
}

async function signIn() {
  if (!formValidator.value.validate()) return

  resetError()

  api.auth.signin(form).then(async ({ token }) => {
    _signIn(token!)

    await navigateTo({
      path: '/',
      query: route.query,
    })
  })
}

function resetError() {
  if (error.value) error.value = null
}

function navigateSignUp() {
  navigateTo({
    path: '/signup',
    query: route.query,
  })
}

function navigateForgotPassword() {
  navigateTo({
    path: '/forgot-password',
    query: route.query,
  })
}
</script>

<template>
  <div>
    <NuxtLayout>
      <div
        data-testid="nc-form-signin"
        class="md:bg-primary bg-opacity-5 signin h-full min-h-[600px] flex flex-col justify-center items-center nc-form-signin"
      >
        <!-- Show loading while checking SSO configuration -->
        <div v-if="appInfo.hackitAuthEnabled && appInfo.disableEmailAuth && !appInfo.googleAuthEnabled && !appInfo.oidcAuthEnabled && !appInfo.samlAuthEnabled" 
             class="bg-white mt-[60px] relative flex flex-col justify-center gap-2 w-full max-w-[500px] mx-auto p-8 md:(rounded-lg border-1 border-gray-200 shadow-xl)">
          <LazyGeneralNocoIcon class="color-transition hover:(ring ring-accent ring-opacity-100)" :animate="true" />
          <div class="self-center flex flex-col justify-center items-center text-center gap-4">
            <h1 class="prose-2xl font-bold my-4 w-full">正在重定向到 HackIt SSO...</h1>
            <div class="flex items-center gap-2">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>請稍候...</span>
            </div>
          </div>
        </div>

        <!-- Traditional login form (only shown if other auth methods are available) -->
        <div v-else
          class="bg-white mt-[60px] relative flex flex-col justify-center gap-2 w-full max-w-[500px] mx-auto p-8 md:(rounded-lg border-1 border-gray-200 shadow-xl)"
        >
          <LazyGeneralNocoIcon class="color-transition hover:(ring ring-accent ring-opacity-100)" :animate="isLoading" />

          <h1 class="prose-2xl font-bold self-center my-4">{{ $t('general.signIn') }}</h1>

          <a-form ref="formValidator" :model="form" layout="vertical" no-style @finish="signIn">
            <template v-if="!appInfo.disableEmailAuth">
              <Transition name="layout">
                <div v-if="error" class="self-center mb-4 bg-red-500 text-white rounded-lg w-3/4 mx-auto p-1">
                  <div class="flex items-center gap-2 justify-center">
                    <MaterialSymbolsWarning />
                    <div class="break-words">{{ error }}</div>
                  </div>
                </div>
              </Transition>

              <a-form-item :label="$t('labels.email')" name="email" :rules="formRules.email">
                <a-input
                  v-model:value="form.email"
                  type="email"
                  autocomplete="email"
                  data-testid="nc-form-signin__email"
                  size="large"
                  :placeholder="$t('msg.info.signUp.workEmail')"
                  @focus="resetError"
                />
              </a-form-item>

              <a-form-item :label="$t('labels.password')" name="password" :rules="formRules.password">
                <a-input-password
                  v-model:value="form.password"
                  autocomplete="current-password"
                  data-testid="nc-form-signin__password"
                  size="large"
                  class="password"
                  :placeholder="$t('msg.info.signUp.enterPassword')"
                  @focus="resetError"
                />
              </a-form-item>

              <div class="hidden md:block text-right">
                <nuxt-link class="prose-sm" @click="navigateForgotPassword">
                  {{ $t('msg.info.signUp.forgotPassword') }}
                </nuxt-link>
              </div>
            </template>

            <div class="self-center flex flex-col flex-wrap gap-4 items-center mt-4 justify-center">
              <template v-if="!appInfo.disableEmailAuth">
                <button data-testid="nc-form-signin__submit" class="scaling-btn bg-opacity-100" type="submit">
                  <span class="flex items-center gap-2">
                    <component :is="iconMap.signin" />
                    {{ $t('general.signIn') }}
                  </span>
                </button>
              </template>
              <a
                v-if="appInfo.googleAuthEnabled"
                :href="`${appInfo.ncSiteUrl}/auth/google`"
                class="scaling-btn bg-opacity-100 after:(!bg-white) !text-primary !no-underline"
              >
                <span class="flex items-center gap-2">
                  <LogosGoogleGmail />

                  {{ $t('labels.signInWithProvider', { provider: 'Google' }) }}
                </span>
              </a>

              <div
                v-if="appInfo.oidcAuthEnabled"
                class="self-center flex flex-col flex-wrap gap-4 items-center mt-4 justify-center"
              >
                <a :href="`${appInfo.ncSiteUrl}/auth/oidc`" class="!text-primary !no-underline">
                  <button type="button" class="scaling-btn bg-opacity-100">
                    <span class="flex items-center gap-2">
                      <MdiLogin />

                      <template v-if="!appInfo.disableEmailAuth">
                        {{ $t('labels.signUpWithProvider', { provider: appInfo.oidcProviderName || 'OpenID Connect' }) }}
                      </template>
                      <template v-else>
                        {{ $t('general.signIn') }}
                      </template>
                    </span>
                  </button>
                </a>
              </div>

              <a
                v-if="appInfo.hackitAuthEnabled"
                :href="`${appInfo.ncSiteUrl}/auth/hackit?state=hackit`"
                class="scaling-btn bg-opacity-100 after:(!bg-white) !text-primary !no-underline"
              >
                <span class="flex items-center gap-2">
                  <MdiLogin />
                  {{ $t('labels.signInWithProvider', { provider: 'HackIt SSO' }) }}
                </span>
              </a>

              <div v-if="!appInfo.inviteOnlySignup && !appInfo.disableEmailAuth" class="text-end prose-sm">
                {{ $t('msg.info.signUp.dontHaveAccount') }}
                <nuxt-link @click="navigateSignUp">{{ $t('general.signUp') }}</nuxt-link>
              </div>
              <template v-if="!appInfo.disableEmailAuth">
                <div class="md:hidden">
                  <nuxt-link class="prose-sm" @click="navigateForgotPassword">
                    {{ $t('msg.info.signUp.forgotPassword') }}
                  </nuxt-link>
                </div>
              </template>
            </div>
          </a-form>
        </div>
      </div>
    </NuxtLayout>
  </div>
</template>

<style lang="scss">
.signin {
  .ant-input-affix-wrapper,
  .ant-input {
    @apply !appearance-none my-1 border-1 border-solid border-primary border-opacity-50 rounded;
  }

  .password {
    input {
      @apply !border-none !m-0;
    }
  }
}
</style>

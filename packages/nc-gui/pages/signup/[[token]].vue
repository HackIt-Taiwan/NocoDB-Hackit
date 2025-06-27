<script setup lang="ts">
import { validatePassword } from 'nocodb-sdk'
import type { RuleObject } from 'ant-design-vue/es/form'

definePageMeta({
  requiresAuth: false,
})

const { $e } = useNuxtApp()

const route = useRoute()

const { appInfo, signIn } = useGlobal()

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

const { navigateToTable } = useTablesStore()

const { clearWorkspaces } = useWorkspace()

const formValidator = ref()

const subscribe = ref(false)

const form = reactive({
  email: '',
  password: '',
})

const formRules = {
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
  ] as RuleObject[],
  password: [
    {
      validator: (_: unknown, v: string) => {
        return new Promise((resolve, reject) => {
          const { error, valid } = validatePassword(v)
          if (valid) return resolve()
          reject(new Error(error))
        })
      },
    },
  ] as RuleObject[],
}

async function signUp() {
  if (!formValidator.value.validate()) return

  resetError()

  const data: any = {
    ...form,
    token: route.params.token,
  }

  data.ignore_subscribe = !subscribe.value

  api.auth.signup(data).then(async (user) => {
    signIn(user.token!)

    $e('a:auth:sign-up')

    try {
      // TODO: Add to swagger
      const base = (user as any).createdProject
      const table = base?.tables?.[0]

      if (base && table) {
        return await navigateToTable({
          baseId: base.id,
          tableId: table.id,
          workspaceId: 'nc',
        })
      }
    } catch (e) {
      console.error(e)
    }

    await navigateTo({
      path: '/',
      query: route.query,
    })
  })
}

function resetError() {
  if (error.value) error.value = null
}

function navigateSignIn() {
  navigateTo({
    path: '/signin',
    query: route.query,
  })
}

onMounted(async () => {
  await clearWorkspaces()
})
</script>

<template>
  <div>
    <NuxtLayout>
      <div class="bg-primary-50 dark:bg-gray-900 relative flex flex-col justify-center items-center signup h-full min-h-[600px]">
        <!-- Show loading while checking SSO configuration -->
        <div v-if="appInfo.hackitAuthEnabled && appInfo.disableEmailAuth && !appInfo.googleAuthEnabled && !appInfo.oidcAuthEnabled && !appInfo.samlAuthEnabled" 
             class="bg-white dark:(!bg-gray-800 !text-white) relative flex flex-col justify-center gap-2 w-full max-w-[500px] mx-auto p-8 md:(rounded-lg border-1 border-gray-200 shadow-xl)">
          <LazyGeneralNocoIcon class="color-transition hover:(ring ring-accent ring-opacity-100)" :animate="true" />
          <div class="self-center flex flex-col justify-center items-center text-center gap-4">
            <h1 class="prose-2xl font-bold my-4 w-full">正在重定向到 HackIt SSO...</h1>
            <div class="flex items-center gap-2">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>請稍候...</span>
            </div>
          </div>
        </div>

        <!-- Traditional signup form (only shown if other auth methods are available) -->
        <div v-else
          class="bg-white dark:(!bg-gray-800 !text-white) relative flex flex-col justify-center gap-2 w-full max-w-[500px] mx-auto p-8 md:(rounded-lg border-1 border-gray-200 shadow-xl)"
        >
          <LazyGeneralNocoIcon class="color-transition hover:(ring ring-accent ring-opacity-100)" :animate="isLoading" />

          <div
            class="self-center flex flex-col justify-center items-center text-center gap-4 w-full"
            data-testid="nc-form-signup"
          >
            <h1 class="prose-2xl font-bold my-4 w-full">{{ $t('general.signUp') }}</h1>

            <a-form ref="formValidator" :model="form" layout="vertical" no-style @finish="signUp">
              <template v-if="!appInfo.disableEmailAuth">
                <Transition name="layout">
                  <div
                    v-if="error"
                    class="self-center mb-4 bg-red-500 text-white rounded-lg w-3/4 mx-auto p-1"
                    data-testid="nc-signup-error"
                  >
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
                    size="large"
                    :placeholder="$t('msg.info.signUp.workEmail')"
                    @focus="resetError"
                  />
                </a-form-item>

                <a-form-item :label="$t('labels.password')" name="password" :rules="formRules.password">
                  <a-input-password
                    v-model:value="form.password"
                    autocomplete="new-password"
                    size="large"
                    class="password"
                    :placeholder="$t('msg.info.signUp.enterPassword')"
                    @focus="resetError"
                  />
                </a-form-item>
              </template>
              <div class="self-center flex flex-col flex-wrap gap-4 items-center mt-4">
                <template v-if="!appInfo.disableEmailAuth">
                  <button class="scaling-btn bg-opacity-100" type="submit">
                    <span class="flex items-center gap-2">
                      <MaterialSymbolsRocketLaunchOutline />

                      {{ $t('general.signUp') }}
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

                    {{ $t('labels.signUpWithProvider', { provider: 'Google' }) }}
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
                          {{ $t('general.signUp') }}
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
                    {{ $t('labels.signUpWithProvider', { provider: 'HackIt SSO' }) }}
                  </span>
                </a>

                <div v-if="!appInfo.disableEmailAuth" class="flex items-center gap-2">
                  <a-switch
                    v-model:checked="subscribe"
                    size="small"
                    class="my-1 hover:(ring ring-accent ring-opacity-100) focus:(!ring !ring-accent ring-opacity-100)"
                  />
                  <div class="prose-xs text-gray-500">{{ $t('msg.subscribeToOurWeeklyNewsletter') }}</div>
                </div>

                <div v-if="!appInfo.disableEmailAuth" class="text-end prose-sm">
                  {{ $t('msg.info.signUp.alreadyHaveAccount') }}

                  <nuxt-link @click="navigateSignIn">{{ $t('general.signIn') }}</nuxt-link>
                </div>
              </div>
            </a-form>
          </div>

          <div v-if="!appInfo.disableEmailAuth" class="prose-sm mt-4 text-gray-500">
            {{ $t('msg.bySigningUp') }}
            <a class="prose-sm !text-gray-500 underline" target="_blank" href="https://nocodb.com/policy-nocodb" rel="noopener">
              {{ $t('title.termsOfService') }}</a
            >
          </div>
        </div>
      </div>
    </NuxtLayout>
  </div>
</template>

<style lang="scss">
.signup {
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

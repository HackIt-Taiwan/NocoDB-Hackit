import type { Api } from 'nocodb-sdk'
import { NcErrorType } from 'nocodb-sdk'
import type { Actions } from '~/composables/useGlobal/types'

/**
 * Global auth middleware
 *
 * On page transitions, this middleware checks if the target route requires authentication.
 * If the user is not signed in, the user is redirected to the sign in page.
 * If the user is signed in and attempts to access a route that does not require authentication (i.e. signin/signup pages),
 * the user is redirected to the home page.
 *
 * By default, we assume that auth is required
 * If not required, mark the page as requiresAuth: false
 *
 * @example
 * ```
 * definePageMeta({
 *   requiresAuth: false
 * })
 * ```
 *
 * If auth should be circumvented completely mark the page as public
 *
 * @example
 * ```
 * definePageMeta({
 *   public: true
 * })
 * ```
 */
export default defineNuxtRouteMiddleware(async (to, from) => {
  const state = useGlobal()

  const { api } = useApi({ useGlobalInstance: true })

  const { allRoles, loadRoles } = useRoles()

  await checkForRedirect()

  /** If baseHostname defined block home page access under subdomains, and redirect to workspace page */
  if (
    state.appInfo.value.baseHostName &&
    !location.hostname?.startsWith(`${state.appInfo.value.mainSubDomain}.`) &&
    to.path === '/'
  ) {
    return navigateTo(`/${location.hostname.split('.')[0]}`)
  }

  /** if user isn't signed in and google auth is enabled, try to check if sign-in data is present */
  if (!state.signedIn.value && state.appInfo.value.googleAuthEnabled) {
    await tryGoogleAuth(api, state.signIn)
  }

  /** if user isn't signed in and only HackIt SSO is enabled, redirect to HackIt SSO */
  if (
    !state.signedIn.value && 
    state.appInfo.value.hackitAuthEnabled && 
    state.appInfo.value.disableEmailAuth && 
    !state.appInfo.value.googleAuthEnabled &&
    to.meta.requiresAuth !== false &&
    to.path !== '/sso'
  ) {
    return navigateTo('/sso')
  }

  /** If user visits signin/signup pages but only HackIt SSO is enabled, redirect to HackIt SSO */
  if (
    !state.signedIn.value &&
    (to.path === '/signin' || to.path === '/signup' || to.path.startsWith('/signup/')) &&
    state.appInfo.value.hackitAuthEnabled && 
    state.appInfo.value.disableEmailAuth && 
    !state.appInfo.value.googleAuthEnabled &&
    !state.appInfo.value.oidcAuthEnabled &&
    !state.appInfo.value.samlAuthEnabled
  ) {
    localStorage.setItem('continueAfterSignIn', to.fullPath)
    window.location.href = `${state.appInfo.value.ncSiteUrl}/auth/hackit?state=hackit`
    return
  }

  /** Try token population based on short-lived-token */
  await tryShortTokenAuth(api, state.signIn)

  /** if public allow all visitors */
  if (to.meta.public) return

  /** if shared base allow without validating */
  if (to.params.typeOrId === 'base') return

  /** if auth is required or unspecified (same `as required) and user is not signed in, redirect to signin page */
  if ((to.meta.requiresAuth || typeof to.meta.requiresAuth === 'undefined') && !state.signedIn.value) {
    /** If only HackIt SSO is enabled, redirect directly to HackIt SSO */
    if (
      state.appInfo.value.hackitAuthEnabled && 
      state.appInfo.value.disableEmailAuth && 
      !state.appInfo.value.googleAuthEnabled &&
      to.path !== '/sso'
    ) {
      localStorage.setItem('continueAfterSignIn', to.fullPath)
      // Direct redirect to HackIt SSO
      window.location.href = `${state.appInfo.value.ncSiteUrl}/auth/hackit?state=hackit`
      return
    }

    /** If this is the first usern navigate to signup page directly */
    if (state.appInfo.value.firstUser && !state.appInfo.value.disableEmailAuth) {
      const query = to.fullPath !== '/' && to.fullPath.match(/^\/(?!\?)/) ? { continueAfterSignIn: to.fullPath } : {}
      if (query.continueAfterSignIn) {
        localStorage.setItem('continueAfterSignIn', query.continueAfterSignIn)
      }

      return navigateTo({
        path: '/signup',
        query,
      })
    }

    try {
      /** try generating access token using refresh token */
      await state.refreshToken({})
    } catch (e) {
      console.info('Refresh token failed', (e as Error)?.message)
    }

    /** if user is still not signed in, redirect to signin page */
    if (!state.signedIn.value) {
      localStorage.setItem('continueAfterSignIn', to.fullPath)
      
      // If only HackIt SSO is enabled, redirect directly
      if (
        state.appInfo.value.hackitAuthEnabled && 
        state.appInfo.value.disableEmailAuth && 
        !state.appInfo.value.googleAuthEnabled
      ) {
        window.location.href = `${state.appInfo.value.ncSiteUrl}/auth/hackit?state=hackit`
        return
      }
      
      return navigateTo({
        path: '/signin',
        query: to.fullPath !== '/' && to.fullPath.match(/^\/(?!\?)/) ? { continueAfterSignIn: to.fullPath } : {},
      })
    }
  } else if (to.meta.requiresAuth === false && state.signedIn.value) {
    if (to.query?.logout) {
      await state.signOut({ redirectToSignin: true })
    }

    /**
     * if user was turned away from non-auth page but also came from a non-auth page (e.g. user went to /signin and reloaded the page)
     * redirect to home page
     *
     * else redirect back to the page they were coming from
     */
    if (from.meta.requiresAuth === false) {
      return navigateTo('/')
    } else {
      return navigateTo(from.path)
    }
  } else {
    /** If page is limited to certain users verify the user have the roles */
    if (to.meta.allowedRoles && to.meta.allowedRoles.every((role) => !allRoles.value?.[role])) {
      message.error("You don't have enough permission to access the page.")
      return navigateTo('/')
    }

    /** if users are accessing the bases without having enough permissions, redirect to My Projects page */
    if (to.params.baseId && from.params.baseId !== to.params.baseId) {
      await loadRoles()

      if (state.user.value?.roles?.guest) {
        message.error("You don't have enough permission to access the base.")

        return navigateTo('/')
      }
    }
  }
})

/**
 * If present, try using google auth data to sign user in before navigating to the next page
 */
async function tryGoogleAuth(api: Api<any>, signIn: Actions['signIn']) {
  if (window.location.search && /\bscope=|\bstate=/.test(window.location.search) && /\bcode=/.test(window.location.search)) {
    let extraProps: any = {}
    try {
      let authProvider = 'google'
      if (window.location.search.includes('state=github')) {
        authProvider = 'github'
      } else if (window.location.search.includes('state=oidc')) {
        authProvider = 'oidc'
      } else if (window.location.search.includes('state=hackit')) {
        authProvider = 'hackit'
      }

      // `extra` prop is used in our cloud implementation, so we are keeping it
      const {
        data: { token, extra },
      } = await api.instance.post(`/auth/${authProvider}/genTokenByCode${window.location.search}`)

      // if extra prop is null/undefined set it as an empty object as fallback
      extraProps = extra || {}

      signIn(token)
    } catch (e: any) {
      message.error(await extractSdkResponseErrorMsg(e))
    }

    const newURL = window.location.href.split('?')[0]
    window.history.pushState(
      'object',
      document.title,
      `${extraProps?.continueAfterSignIn ? `${newURL}#/?continueAfterSignIn=${extraProps.continueAfterSignIn}` : newURL}`,
    )
    window.location.reload()
  }
}

/**
 * If short-token present, try using it to generate long-living token before navigating to the next page
 */
async function tryShortTokenAuth(api: Api<any>, signIn: Actions['signIn']) {
  const { setError } = useSsoError()

  if (window.location.search && /\bshort-token=/.test(window.location.search)) {
    let extraProps: any = {}
    try {
      // `extra` prop is used in our cloud implementation, so we are keeping it
      const { data } = await api.instance.post(
        `/auth/long-lived-token`,
        {},
        {
          headers: {
            'xc-short-token': window.location.search.split('=')[1],
          } as any,
        },
      )

      const { token, extra } = data

      // if extra prop is null/undefined set it as an empty object as fallback
      extraProps = extra || {}

      signIn(token)
    } catch (e: any) {
      if (e?.response?.data?.error === NcErrorType.MAX_WORKSPACE_LIMIT_REACHED) {
        // Store error information in global state
        setError({
          type: NcErrorType.MAX_WORKSPACE_LIMIT_REACHED,
          message: e?.response?.data?.message || 'Maximum workspace limit reached',
        })
        // navigate to sso page and display the error details
        return await navigateTo('/sso')
      }
      message.error(await extractSdkResponseErrorMsg(e))
    }

    const newURL = window.location.href.split('?')[0]
    window.history.pushState(
      'object',
      document.title,
      `${extraProps?.continueAfterSignIn ? `${newURL}#/?continueAfterSignIn=${extraProps.continueAfterSignIn}` : newURL}`,
    )
    window.location.reload()
  }
}

/** Check if url contains redirect param and redirect to the url if found */
async function checkForRedirect() {
  if (window.location.search && /\bui-redirect=/.test(window.location.search)) {
    let url
    try {
      url = decodeURIComponent(window.location.search.split('=')[1])
    } catch (e: any) {
      message.error(await extractSdkResponseErrorMsg(e))
    }

    const newURL = window.location.href.split('?')[0]
    window.history.pushState('object', document.title, `${newURL}#${url}`)
    window.location.reload()
  }
}

import { ref, reactive, computed } from 'vue';
import { defineStore } from 'pinia';
import { useLoading } from '@sa/hooks';
import { SetupStoreId } from '@/enum';
import { useRouterPush } from '@/hooks/common/router';
import { fetchLogin, fetchGetUserInfo } from '@/service/api';
import { localStg } from '@/utils/storage';
import { useRouteStore } from '../route';
import { getToken, getUserInfo, clearAuthStorage } from './shared';
import { $t } from '@/locales';

export const useAuthStore = defineStore(SetupStoreId.Auth, () => {
  const routeStore = useRouteStore();
  const { route, toLogin, redirectFromLogin } = useRouterPush(false);
  const { loading: loginLoading, startLoading, endLoading } = useLoading();

  const token = ref(getToken());

  const userInfo: Api.Auth.UserInfo = reactive(getUserInfo());

  /**
   * is login
   */
  const isLogin = computed(() => Boolean(token.value));

  /**
   * reset auth store
   */
  async function resetStore() {
    const authStore = useAuthStore();

    clearAuthStorage();

    authStore.$reset();

    if (!route.value.meta.constant) {
      await toLogin();
    }

    routeStore.resetStore();
  }

  /**
   * login
   * @param userName user name
   * @param password password
   */
  async function login(userName: string, password: string) {
    startLoading();

    try {
      const { data: loginToken } = await fetchLogin(userName, password);

      await loginByToken(loginToken);

      await routeStore.initAuthRoute();

      await redirectFromLogin();

      if (routeStore.isInitAuthRoute) {
        window.$notification?.success({
          message: $t('page.login.common.loginSuccess'),
          description: $t('page.login.common.welcomeBack', { userName: userInfo.userName })
        });
      }
    } catch {
      resetStore();
    } finally {
      endLoading();
    }
  }

  async function loginByToken(loginToken: Api.Auth.LoginToken) {
    // 1. stored in the localStorage, the later requests need it in headers
    localStg.set('token', loginToken.token);
    localStg.set('refreshToken', loginToken.refreshToken);

    const { data: info } = await fetchGetUserInfo();

    // 2. store user info
    localStg.set('userInfo', info);

    // 3. update auth route
    token.value = loginToken.token;
    Object.assign(userInfo, info);
  }

  return {
    token,
    userInfo,
    isLogin,
    loginLoading,
    resetStore,
    login
  };
});

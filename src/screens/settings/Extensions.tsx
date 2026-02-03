import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  TextInput,
  Switch,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SettingsStackParamList} from '../../App';
import {
  MaterialCommunityIcons,
  MaterialIcons,
  Feather,
  FontAwesome6,
} from '@expo/vector-icons';
import useThemeStore from '../../lib/zustand/themeStore';
import useContentStore from '../../lib/zustand/contentStore';
import {
  extensionStorage,
  ProviderExtension,
} from '../../lib/storage/extensionStorage';
import {extensionManager} from '../../lib/services/ExtensionManager';
import {
  updateProvidersService,
  UpdateInfo,
} from '../../lib/services/UpdateProviders';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {settingsStorage} from '../../lib/storage';
import RenderProviderFlagIcon from '../../components/RenderProviderFLagIcon';

type Props = NativeStackScreenProps<SettingsStackParamList, 'Extensions'>;

type TabType = 'installed' | 'available';

const Extensions = ({navigation}: Props) => {
  const {primary} = useThemeStore(state => state);
  const {
    provider: activeExtensionProvider,
    setProvider: setActiveExtensionProvider,
    installedProviders,
    availableProviders,
    setInstalledProviders,
    setAvailableProviders,
  } = useContentStore(state => state);
  const [activeTab, setActiveTab] = useState<TabType>(
    installedProviders?.length > 0 ? 'installed' : 'available',
  );
  const [installingProvider, setInstallingProvider] = useState<string | null>(
    null,
  );
  const [updatingProvider, setUpdatingProvider] = useState<string | null>(null);
  const [updateInfos, setUpdateInfos] = useState<UpdateInfo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [useCustomBaseUrl, setUseCustomBaseUrl] = useState(
    settingsStorage.isUsingCustomProviderBaseUrl(),
  );
  const [customBaseUrl, setCustomBaseUrl] = useState(
    settingsStorage.getCustomProviderBaseUrl(),
  );
  const [showBaseUrlSettings, setShowBaseUrlSettings] = useState(false);
  // Load providers on component mount
  useEffect(() => {
    const initializeExtensions = async () => {
      try {
        await extensionManager.initialize();
        loadProviders();
        await checkForUpdates();

        // Try to fetch latest providers if we don't have any
        if (!availableProviders || availableProviders.length === 0) {
          await handleRefresh();
        }
      } catch (error) {
        // Still try to load from cache if initialization fails
        loadProviders();
      }
    };

    initializeExtensions();
  }, []);
  const loadProviders = () => {
    const installed = extensionStorage.getInstalledProviders() || [];
    const available = extensionStorage.getAvailableProviders() || [];
    setInstalledProviders(installed);
    setAvailableProviders(available.filter(item => item && !item.disabled));
  };
  const checkForUpdates = async () => {
    try {
      const updates = await updateProvidersService.checkForUpdatesManual();
      setUpdateInfos(updates);
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  };

  const handleUpdateProvider = async (provider: ProviderExtension) => {
    if (!provider || !provider.value) {
      Alert.alert('Error', 'Invalid provider data');
      return;
    }

    if (settingsStorage.isHapticFeedbackEnabled()) {
      ReactNativeHapticFeedback.trigger('effectClick', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    }

    setUpdatingProvider(provider.value);
    try {
      const success = await updateProvidersService.updateProvider(provider);
      if (success) {
        loadProviders();
        await checkForUpdates();

        Alert.alert(
          'Success',
          `${provider.display_name} has been updated successfully!`,
        );

        // Update the active provider if it was the one being updated
        if (activeExtensionProvider?.value === provider.value) {
          setActiveExtensionProvider(provider);
        }
      } else {
        Alert.alert('Error', 'Failed to update provider. Please try again.');
      }
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Error', 'Failed to update provider. Please try again.');
    } finally {
      setUpdatingProvider(null);
    }
  };

  const handleTabChange = (tab: TabType) => {
    if (settingsStorage.isHapticFeedbackEnabled()) {
      ReactNativeHapticFeedback.trigger('effectTick', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    }
    setActiveTab(tab);
  };
  const handleInstallProvider = async (provider: ProviderExtension) => {
    if (!provider || !provider.value) {
      Alert.alert('Error', 'Invalid provider data');
      return;
    }

    if (settingsStorage.isHapticFeedbackEnabled()) {
      ReactNativeHapticFeedback.trigger('effectClick', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    }

    setInstallingProvider(provider.value);
    try {
      await extensionManager.installProvider(provider);
      loadProviders();

      Alert.alert(
        'Success',
        `${provider.display_name} has been installed successfully!`,
      );
      setInstalledProviders(extensionStorage.getInstalledProviders() || []);
      if (
        !activeExtensionProvider ||
        activeExtensionProvider.value !== provider.value
      ) {
        setActiveExtensionProvider(provider);
      }
    } catch (error) {
      console.error('Installation error:', error);
      Alert.alert('Error', 'Failed to install provider. Please try again.');
    } finally {
      setInstallingProvider(null);
    }
  };
  const handleUninstallProvider = (provider: ProviderExtension) => {
    if (!provider || !provider.value) {
      Alert.alert('Error', 'Invalid provider data');
      return;
    }

    Alert.alert(
      'Uninstall Provider',
      `Are you sure you want to uninstall ${
        provider.display_name || 'this provider'
      }?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Uninstall',
          style: 'destructive',
          onPress: () => {
            extensionStorage.uninstallProvider(provider.value);
            loadProviders();
            setInstalledProviders(
              extensionStorage.getInstalledProviders() || [],
            );

            // If this was the active provider, clear it
            if (activeExtensionProvider?.value === provider?.value) {
              setActiveExtensionProvider(
                extensionStorage.getInstalledProviders()[0] || {
                  value: '',
                  display_name: '',
                  type: '',
                  version: '',
                },
              );
            }
          },
        },
      ],
    );
  };
  const handleSetActiveProvider = (provider: ProviderExtension) => {
    if (!provider || !provider.value) {
      Alert.alert('Error', 'Invalid provider data');
      return;
    }

    if (settingsStorage.isHapticFeedbackEnabled()) {
      ReactNativeHapticFeedback.trigger('effectClick', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    }
    setActiveExtensionProvider(provider);
  };

  const handleToggleCustomBaseUrl = (enabled: boolean) => {
    if (enabled) {
      // Show warning when enabling custom URL
      Alert.alert(
        '⚠️ Security Warning',
        'Custom provider sources can run arbitrary code in the app. Only use provider URLs from sources you absolutely trust.',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'I Understand',
            style: 'destructive',
            onPress: () => {
              setUseCustomBaseUrl(true);
              settingsStorage.setUseCustomProviderBaseUrl(true);
            },
          },
        ],
      );
    } else {
      setUseCustomBaseUrl(false);
      settingsStorage.setUseCustomProviderBaseUrl(false);
    }
  };

  const handleSaveCustomBaseUrl = () => {
    if (!customBaseUrl.trim()) {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    // Basic URL validation
    const isValidUrl = (url: string): boolean => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    };

    if (!isValidUrl(customBaseUrl)) {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    settingsStorage.setCustomProviderBaseUrl(customBaseUrl.trim());
    Alert.alert(
      'Success',
      'Provider base URL updated. Pull to refresh to load providers from the new source.',
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const providers = await extensionManager.fetchManifest(true);

      // Update available providers in storage and state
      extensionStorage.setAvailableProviders(providers);
      setAvailableProviders(providers);

      loadProviders();
      await checkForUpdates();
    } catch (error) {
      console.error('Refresh error:', error);
      Alert.alert(
        'Error',
        'Failed to refresh providers list. Please check your internet connection.',
      );
    } finally {
      setRefreshing(false);
    }
  };
  const renderProviderCard = ({item}: {item: ProviderExtension}) => {
    if (!item || !item.value) return null;
    const isActive = activeExtensionProvider?.value === item.value;
    const isInstalled = extensionStorage.isProviderInstalled(item.value);
    const isInstalling = installingProvider === item.value;
    const isUpdating = updatingProvider === item.value;
    const updateInfo = updateInfos.find(
      info => info.provider.value === item.value,
    );
    const hasUpdate = updateInfo?.hasUpdate || false;

    return (
      <View
        className="bg-tertiary rounded-2xl p-5 py-3 mb-4 mx-4 shadow-lg border border-quaternary"
        style={{elevation: 4}}>
        <View className="flex-row items-center mb-4 gap-4 justify-between">
          {/* Left: Icon */}
          {item.icon ? (
            <Image
              source={{uri: item.icon}}
              className="w-12 h-12 rounded-xl border-2 border-primary bg-quaternary"
              style={{resizeMode: 'cover'}}
            />
          ) : (
            <View className="px-3 py-2 bg-quaternary rounded-xl border border-gray-700">
              <RenderProviderFlagIcon type={item.type} />
            </View>
          )}
          {/* Middle: Info */}
          <View className="flex-1 mx-3">
            <View className="flex-row items-center flex-wrap">
              <Text className="text-white text-lg font-bold tracking-wide flex-1">
                {item.display_name || 'Unknown Provider'}
              </Text>
              {hasUpdate && updateInfo && (
                <View
                  style={{backgroundColor: primary}}
                  className="px-2 py-0.5 rounded-full ml-1">
                  <Text className="text-xs text-white font-semibold bg-gray-800">
                    Update
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-gray-400 text-sm ">
              Version{' '}
              <Text className="text-white font-medium">
                {item.version || 'Unknown'}
              </Text>{' '}
              • {item.type || 'Unknown'}
            </Text>
          </View>
          {/* Right: Buttons */}
          <View className="flex-row gap-3 items-center">
            {activeTab === 'installed' ? (
              <>
                <TouchableOpacity
                  onPress={() => handleSetActiveProvider(item)}
                  className={`w-9 h-9 rounded-full items-center justify-center ${
                    isActive ? 'bg-green-600' : 'bg-gray-700'
                  }`}
                  style={{opacity: isActive ? 1 : 0.9}}>
                  <MaterialIcons
                    name={isActive ? 'check-circle' : 'radio-button-unchecked'}
                    size={20}
                    color="white"
                  />
                </TouchableOpacity>
                {hasUpdate && (
                  <TouchableOpacity
                    onPress={() => handleUpdateProvider(updateInfo!.provider)}
                    disabled={isUpdating}
                    className="w-9 h-9 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: primary,
                      opacity: isUpdating ? 0.7 : 1,
                    }}>
                    {isUpdating ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <MaterialCommunityIcons
                        name="update"
                        size={20}
                        color="white"
                      />
                    )}
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => handleUninstallProvider(item)}
                  className="w-9 h-9 rounded-full items-center justify-center bg-red-600">
                  <MaterialCommunityIcons
                    name="delete"
                    size={20}
                    color="white"
                  />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={() => handleInstallProvider(item)}
                disabled={isInstalled || isInstalling}
                className={'w-9 h-9 rounded-full items-center justify-center'}
                style={{
                  opacity: isInstalling ? 0.7 : 1,
                  backgroundColor: isInstalled ? 'gray' : primary,
                }}>
                {isInstalling ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <MaterialCommunityIcons
                    name={isInstalled ? 'check' : 'download'}
                    size={20}
                    color="white"
                  />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };
  const currentData =
    activeTab === 'installed'
      ? (installedProviders || []).filter(item => item && item.value)
      : (availableProviders || []).filter(item => item && item.value);

  return (
    <View className="flex-1 bg-black pt-10 pb-16">
      <StatusBar backgroundColor="black" barStyle="light-content" />
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 border-b border-gray-800">
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <FontAwesome6 name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-semibold">Providers</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Feather name="refresh-cw" size={24} color={primary} />
        </TouchableOpacity>
      </View>
      {/* Tabs */}
      <View className="flex-row bg-quaternary mx-4 mt-4 rounded-xl">
        <TouchableOpacity
          onPress={() => handleTabChange('installed')}
          className="flex-1 py-3 rounded-xl"
          style={{
            backgroundColor:
              activeTab === 'installed' ? primary : 'transparent',
          }}>
          <Text
            className={`text-center font-medium ${
              activeTab === 'installed' ? 'text-white' : 'text-gray-400'
            }`}>
            Installed ({(installedProviders || []).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleTabChange('available')}
          className="flex-1 py-3 rounded-xl"
          style={{
            backgroundColor:
              activeTab === 'available' ? primary : 'transparent',
          }}>
          <Text
            className={`text-center font-medium ${
              activeTab === 'available' ? 'text-white' : 'text-gray-400'
            }`}>
            Available ({(availableProviders || []).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Custom Provider Base URL Settings */}
      <View className="mx-4 mt-4">
        <TouchableOpacity
          className="flex-row items-center justify-between bg-tertiary rounded-xl px-4 py-3 border border-quaternary"
          onPress={() => setShowBaseUrlSettings(!showBaseUrlSettings)}>
          <View className="flex-row items-center">
            <MaterialCommunityIcons
              name="cog-outline"
              size={22}
              color="#9CA3AF"
            />
            <Text className="text-white ml-3 font-medium">
              Provider Source Settings
            </Text>
          </View>
          <MaterialIcons
            name={showBaseUrlSettings ? 'expand-less' : 'expand-more'}
            size={24}
            color="#9CA3AF"
          />
        </TouchableOpacity>

        {showBaseUrlSettings && (
          <View className="bg-tertiary rounded-xl mt-2 p-4 border border-quaternary">
            {/* Warning Banner */}
            <View className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-3 mb-4">
              <View className="flex-row items-center mb-2">
                <MaterialCommunityIcons
                  name="alert-outline"
                  size={20}
                  color="#F59E0B"
                />
                <Text className="text-yellow-500 font-bold ml-2">
                  Security Warning
                </Text>
              </View>
              <Text className="text-yellow-600/90 text-xs leading-5">
                Providers can execute arbitrary code in the app. Only use
                sources you trust.
              </Text>
            </View>

            {/* Toggle for Custom URL */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1">
                <Text className="text-white font-medium">
                  Use Custom Provider Source
                </Text>
                <Text className="text-gray-400 text-xs mt-1">
                  Override the default provider repository
                </Text>
              </View>
              <Switch
                value={useCustomBaseUrl}
                onValueChange={handleToggleCustomBaseUrl}
                trackColor={{false: '#374151', true: primary}}
                thumbColor={useCustomBaseUrl ? '#fff' : '#9CA3AF'}
              />
            </View>

            {/* Custom URL Input */}
            {useCustomBaseUrl && (
              <View>
                <Text className="text-gray-400 text-sm mb-2">
                  Provider Base URL
                </Text>
                <View className="flex-row items-center">
                  <TextInput
                    className="flex-1 bg-quaternary rounded-lg px-4 py-3 text-white border border-gray-700"
                    placeholder="https://example.com/providers"
                    placeholderTextColor="#6B7280"
                    value={customBaseUrl}
                    onChangeText={setCustomBaseUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                  <TouchableOpacity
                    onPress={handleSaveCustomBaseUrl}
                    className="ml-2 px-4 py-3 rounded-lg"
                    style={{backgroundColor: primary}}>
                    <Text className="text-white font-medium">Save</Text>
                  </TouchableOpacity>
                </View>
                <Text className="text-gray-500 text-xs mt-2">
                  URL should point to a repository containing manifest.json and
                  provider files
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Provider list */}
      <FlatList
        data={currentData}
        keyExtractor={(item, index) => item?.value || `provider-${index}`}
        renderItem={renderProviderCard}
        className="flex-1 mt-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[primary]}
            tintColor={primary}
            progressBackgroundColor="black"
          />
        }
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-20">
            <MaterialCommunityIcons
              name="package-variant"
              size={64}
              color="gray"
            />
            <Text className="text-gray-400 text-lg mt-4">
              {activeTab === 'installed'
                ? 'No providers installed'
                : 'No providers available'}
            </Text>
            <Text className="text-gray-500 text-sm mt-2 text-center px-8">
              {activeTab === 'installed'
                ? 'Install providers from the Available tab to get started'
                : 'Pull to refresh to check for available providers'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

export default Extensions;

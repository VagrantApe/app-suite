import auth from '@react-native-firebase/auth'
import Purchases from 'react-native-purchases'
import { Platform } from 'react-native'

export async function register(email: string, password: string) {
  return auth().createUserWithEmailAndPassword(email, password)
}
export async function deleteAccount() {
  await auth().currentUser?.delete()
}
export async function loadPaywall() {
  return (await Purchases.getOfferings()).current
}
export const restore = () => Purchases.restorePurchases()
export const links = { terms: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/', privacy: 'https://example.com/privacy' }
export const restoreHelp = Platform.OS === 'ios' ? 'Purchases are tied to your Apple ID.' : 'Purchases are tied to your Google account.'

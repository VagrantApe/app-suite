import auth from '@react-native-firebase/auth'
import Purchases from 'react-native-purchases'

export async function register(email: string, password: string) {
  return auth().createUserWithEmailAndPassword(email, password)
}

export async function loadPaywall() {
  const offerings = await Purchases.getOfferings()
  return offerings.current
}

export const restoreHelp = 'Purchases are tied to your Google account.'
export const tagline = 'Lorem ipsum dolor sit amet'
export const claim = 'Our AI can diagnose your sleep problems.'

export async function post(db: any, text: string) {
  return db.collection('posts').add({ text })
}

// TODO(launch): add the privacy policy screen
export const priceLabel = 'Pro: $4.99 per month'

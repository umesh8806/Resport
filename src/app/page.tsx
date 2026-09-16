import { getPublicSettings, getPublicFormOptions } from '@/actions/publicResult'
import PublicSearchForm from '@/components/PublicSearchForm'

export const dynamic = 'force-dynamic'

export default async function PublicPortalPage() {
  // 🚀 Fetch all required configuration and options SERVER-SIDE before rendering
  // This completely eliminates client-side loading spinners and waterfall network requests
  const [settings, options] = await Promise.all([
    getPublicSettings(),
    getPublicFormOptions()
  ])

  return (
    <PublicSearchForm 
      initialMode={settings.mode} 
      initialOptions={options} 
    />
  )
}

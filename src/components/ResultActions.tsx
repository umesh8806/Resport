'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Printer, Download, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function ResultActions({ resultId, studentName }: { resultId: string, studentName?: string }) {
  const router = useRouter()
  const [downloading, setDownloading] = useState(false)

  const handleDownloadPDF = async () => {
    setDownloading(true)
    try {
      const html2canvas = (await import('html2canvas-pro')).default
      const { jsPDF } = await import('jspdf')
      
      const element = document.getElementById('printable-result-card')
      if (!element) throw new Error('Result card not found')

      // Capture the element using html2canvas-pro (which supports oklch and lab colors)
      const canvas = await html2canvas(element, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/jpeg', 0.98)
      
      // Initialize jsPDF and fit the image onto an A4 page
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
      const margin = 10
      const pdfWidth = pdf.internal.pageSize.getWidth() - (margin * 2)
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      
      pdf.addImage(imgData, 'JPEG', margin, margin, pdfWidth, pdfHeight)
      pdf.save(`Result_${studentName || resultId}.pdf`)
    } catch (err: any) {
      console.error('PDF Generation failed', err)
      alert(`Failed to generate PDF: ${err?.message || String(err)}\n\nThe page will now refresh. You can also try using the Print button and selecting "Save as PDF".`)
      window.location.reload()
    } finally {
      setDownloading(false)
      // Cleanup any leftover overlays that might block clicks if reload is prevented
      document.querySelectorAll('.html2pdf__container, .html2canvas-container').forEach(el => el.remove())
    }
  }

  return (
    <div className="flex justify-between items-center print:hidden mb-4">
      <Button variant="ghost" onClick={() => router.push('/')} className="text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Search
      </Button>
      
      <div className="flex space-x-2">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" /> Print
        </Button>
        <Button onClick={handleDownloadPDF} disabled={downloading}>
          <Download className="w-4 h-4 mr-2" /> {downloading ? 'Generating...' : 'Download PDF'}
        </Button>
      </div>
    </div>
  )
}


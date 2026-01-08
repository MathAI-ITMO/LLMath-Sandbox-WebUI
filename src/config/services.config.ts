/**
 * Configuration for external services used by the application
 */

export interface ServicesConfig {
  /** Base URL for the video service (VideoApp) */
  videoServiceUrl: string
  /** Base URL for the LLMath Problems API */
  problemsApiUrl: string
  /** Base URL for the MathLLM Backend API */
  backendApiUrl: string
}

/**
 * Default service configuration
 * These values can be overridden via environment variables
 */
export const servicesConfig: ServicesConfig = {
  videoServiceUrl: import.meta.env.VITE_VIDEO_SERVICE_URL || 'http://localhost:5001',
  problemsApiUrl: import.meta.env.VITE_PROBLEMS_API_URL || 'http://localhost:8001',
  backendApiUrl: import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:5000'
}

/**
 * Helper function to construct video URL from filename
 * @param filename - Video filename (e.g., "03.mp4")
 * @returns Full URL to the VideoApp page with the video loaded
 */
export function getVideoUrl(filename: string): string {
  if (!filename) return ''
  
  // If it's already a full URL (for backward compatibility), return as is
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename
  }
  
  // Remove leading slash if present
  const cleanFilename = filename.startsWith('/') ? filename.slice(1) : filename
  
  // Construct URL to VideoApp page with video loaded
  // This opens the full VideoApp interface with chat, subtitles, etc.
  return `${servicesConfig.videoServiceUrl}/${cleanFilename}`
}

/**
 * Helper function to extract filename from theory link
 * @param theoryLink - Full URL or filename
 * @returns Just the filename
 */
export function extractVideoFilename(theoryLink: string): string {
  if (!theoryLink) return ''
  
  // If it's already just a filename, return it
  if (!theoryLink.includes('/')) {
    return theoryLink
  }
  
  // Extract filename from URL
  try {
    const url = new URL(theoryLink)
    const pathname = url.pathname
    const filename = pathname.split('/').pop() || ''
    return filename
  } catch {
    // Not a valid URL, try to extract from path
    return theoryLink.split('/').pop() || theoryLink
  }
}

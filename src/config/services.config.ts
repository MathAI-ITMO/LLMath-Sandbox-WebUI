/**
 * Configuration for external services used by the application
 * Uses relative paths that work with both dev (Vite proxy) and production (nginx)
 */

export interface ServicesConfig {
  /** Base URL for the video service (VideoApp) */
  videoServiceUrl: string
}

/**
 * Default service configuration
 * Uses relative paths that will be proxied in dev and handled by nginx in production
 */
export const servicesConfig: ServicesConfig = {
  videoServiceUrl: '/video'
}

/**
 * Helper function to construct video URL from filename
 * @param filename - Video filename (e.g., "03.mp4")
 * @returns Relative URL to the VideoApp page with the video loaded
 */
export function getVideoUrl(filename: string): string {
  if (!filename) return ''
  
  // If it's already a full URL (for backward compatibility), return as is
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename
  }
  
  // Remove leading slash if present
  const cleanFilename = filename.startsWith('/') ? filename.slice(1) : filename
  
  // Construct relative URL to VideoApp page with video loaded
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

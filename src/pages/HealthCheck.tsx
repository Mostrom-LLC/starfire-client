import { useEffect } from 'react';

export default function HealthCheck() {
  useEffect(() => {
    // This will make the server return a 200 status code
    // The actual status code handling should be done in your server configuration
    return () => {
      // Cleanup if needed
    };
  }, []);

  return null; // No need to render anything for a health check
}

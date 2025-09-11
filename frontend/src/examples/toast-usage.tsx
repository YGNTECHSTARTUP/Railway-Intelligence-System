// Example usage of toast with Sonner
// This file demonstrates how to use the toast functionality in your components

import { toast } from "sonner"
import { useToast } from "@/hooks/use-toast"

// Direct usage with Sonner (simple)
export function ExampleWithDirectSonner() {
  const handleClick = () => {
    toast("Event has been created.")
  }

  return (
    <button onClick={handleClick}>
      Show Simple Toast
    </button>
  )
}

// Usage with custom hook (more flexible)
export function ExampleWithCustomHook() {
  const { toast } = useToast()

  const handleSuccess = () => {
    toast({
      title: "Success!",
      description: "Your operation completed successfully.",
    })
  }

  const handleError = () => {
    toast({
      title: "Error occurred",
      description: "Something went wrong. Please try again.",
      variant: "destructive",
    })
  }

  return (
    <div className="space-x-2">
      <button onClick={handleSuccess}>
        Show Success Toast
      </button>
      <button onClick={handleError}>
        Show Error Toast
      </button>
    </div>
  )
}

// Advanced usage with different toast types
export function ExampleAdvancedUsage() {
  const showSuccessToast = () => {
    toast.success("Success message!")
  }

  const showErrorToast = () => {
    toast.error("Error message!")
  }

  const showInfoToast = () => {
    toast.info("Info message!")
  }

  const showWarningToast = () => {
    toast.warning("Warning message!")
  }

  const showPromiseToast = () => {
    const promise = () => new Promise((resolve) => setTimeout(resolve, 2000))

    toast.promise(promise, {
      loading: "Loading...",
      success: "Success!",
      error: "Error occurred!",
    })
  }

  return (
    <div className="space-x-2">
      <button onClick={showSuccessToast}>Success</button>
      <button onClick={showErrorToast}>Error</button>
      <button onClick={showInfoToast}>Info</button>
      <button onClick={showWarningToast}>Warning</button>
      <button onClick={showPromiseToast}>Promise</button>
    </div>
  )
}

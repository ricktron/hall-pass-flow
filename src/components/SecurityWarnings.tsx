
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const SecurityWarnings = () => {
  return (
    <div className="mb-6 space-y-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Security Configuration Required</AlertTitle>
        <AlertDescription>
          <strong>Email OTP Expiry:</strong> Your Supabase email OTP expiry is currently set to over 1 hour. 
          For security, please reduce this to 15 minutes or less in your Supabase Dashboard → 
          Authentication → Settings → Auth Configuration → Email OTP expiry.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default SecurityWarnings;

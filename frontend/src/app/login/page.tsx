"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Train, 
  Lock, 
  User, 
  AlertCircle, 
  Loader2,
  Shield,
  Activity
} from "lucide-react";
import { useAuth, useLoginForm } from '@/hooks/useAuth';

export default function LoginPage() {
  const { isAuthenticated } = useAuth();
  const { formState, updateField, handleSubmit } = useLoginForm();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const demoCredentials = [
    { username: 'admin', password: 'admin123', role: 'Admin', description: 'Full system access' },
    { username: 'operator', password: 'operator123', role: 'Operator', description: 'Operations & optimization' },
    { username: 'viewer', password: 'viewer123', role: 'Viewer', description: 'Read-only access' },
  ];

  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="p-3 bg-blue-600 rounded-lg">
              <Train className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Railway Intelligence</h1>
              <p className="text-sm text-gray-600">System Login</p>
            </div>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <Badge variant="outline" className="flex items-center space-x-1">
              <Activity className="h-3 w-3" />
              <span>System Online</span>
            </Badge>
            <Badge variant="secondary">
              OR-Tools Integrated
            </Badge>
          </div>
        </div>

        {/* Login Form */}
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl flex items-center space-x-2">
              <Lock className="h-5 w-5" />
              <span>Sign In</span>
            </CardTitle>
            <CardDescription>
              Enter your credentials to access the railway intelligence system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter username"
                    value={formState.username}
                    onChange={(e) => updateField('username', e.target.value)}
                    disabled={formState.isLoading}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={formState.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    disabled={formState.isLoading}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {formState.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{formState.error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full"
                disabled={formState.isLoading}
              >
                {formState.isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Credentials */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2 text-blue-800">
              <User className="h-4 w-4" />
              <span>Demo Credentials</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {demoCredentials.map((cred, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-2 bg-white rounded border cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => {
                  updateField('username', cred.username);
                  updateField('password', cred.password);
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{cred.username}</span>
                    <Badge variant={
                      cred.role === 'Admin' ? 'destructive' :
                      cred.role === 'Operator' ? 'default' : 'secondary'
                    } className="text-xs">
                      {cred.role}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">{cred.description}</p>
                </div>
                <div className="text-xs text-gray-400 font-mono">{cred.password}</div>
              </div>
            ))}
            <p className="text-xs text-blue-600 text-center">
              Click any credential to auto-fill the form
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>Railway Intelligence System v1.0.0</p>
          <p>Powered by OR-Tools & Rust Backend</p>
        </div>
      </div>
    </div>
  );
}

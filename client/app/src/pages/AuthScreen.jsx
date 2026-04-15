import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BookOpen,
  Zap,
  Award,
  Briefcase,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
} from "lucide-react";

const FEATURES = [
  { icon: BookOpen, text: "500+ Courses across all disciplines" },
  { icon: Zap, text: "Skill Exchange with real learners" },
  { icon: Award, text: "Certified Learning & Credentials" },
  { icon: Briefcase, text: "Job Board & Career Opportunities" },
];

export default function AuthScreen() {
  const [mode, setMode] = useState("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Left Hero Panel */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex w-1/2 bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-800 flex-col justify-between p-12 text-white relative overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5" />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
          <div className="absolute top-1/2 left-1/4 w-48 h-48 rounded-full bg-white/5" />
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <span className="text-2xl font-bold tracking-tight">SkillVerse</span>
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl font-extrabold leading-tight mb-4">
            Learn. Teach.
            <br />
            Grow Together.
          </h2>
          <p className="text-white/70 text-lg mb-10">
            Join thousands of learners building real skills and advancing their
            careers.
          </p>
          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-white/90 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/40 text-xs relative z-10">
          © 2026 SkillVerse. All rights reserved.
        </p>
      </motion.div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-white font-bold">S</span>
            </div>
            <span className="text-xl font-bold">SkillVerse</span>
          </div>

          <h1 className="text-2xl font-bold mb-1">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            {mode === "signin"
              ? "Sign in to continue to SkillVerse"
              : "Start your learning journey today"}
          </p>

          {mode === "signin" ? (
            <SignInForm
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              onSwitch={() => setMode("register")}
            />
          ) : (
            <RegisterForm
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              showConfirm={showConfirm}
              setShowConfirm={setShowConfirm}
              onSwitch={() => setMode("signin")}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}

function SignInForm({ showPassword, setShowPassword, onSwitch }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="email" placeholder="you@example.com" className="pl-9" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Password</Label>
          <button className="text-xs text-primary hover:underline">
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            className="pl-9 pr-9"
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="remember" />
        <Label
          htmlFor="remember"
          className="text-sm font-normal cursor-pointer"
        >
          Remember me
        </Label>
      </div>

      <Button className="w-full" size="lg">
        Sign In
      </Button>

      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-xs text-muted-foreground">
            OR
          </span>
        </div>
      </div>

      <Button variant="outline" className="w-full" size="lg">
        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <button
          onClick={onSwitch}
          className="text-primary font-medium hover:underline"
        >
          Sign Up
        </button>
      </p>
    </div>
  );
}

function RegisterForm({
  showPassword,
  setShowPassword,
  showConfirm,
  setShowConfirm,
  onSwitch,
}) {
  const [role, setRole] = useState("student");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Full Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="John Doe" className="pl-9" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="email" placeholder="you@example.com" className="pl-9" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            className="pl-9 pr-9"
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Confirm Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type={showConfirm ? "text" : "password"}
            placeholder="••••••••"
            className="pl-9 pr-9"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showConfirm ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>I am a...</Label>
        <div className="grid grid-cols-2 gap-3">
          {["student", "instructor"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`border rounded-lg py-3 text-sm font-medium transition-colors ${
                role === r
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {r === "student" ? "🎓 Student" : "👨‍🏫 Instructor"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2">
        <Checkbox id="terms" className="mt-0.5" />
        <Label
          htmlFor="terms"
          className="text-sm font-normal cursor-pointer leading-snug"
        >
          I agree to the{" "}
          <span className="text-primary cursor-pointer hover:underline">
            Terms of Service
          </span>{" "}
          and{" "}
          <span className="text-primary cursor-pointer hover:underline">
            Privacy Policy
          </span>
        </Label>
      </div>

      <Button className="w-full" size="lg">
        Create Account
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button
          onClick={onSwitch}
          className="text-primary font-medium hover:underline"
        >
          Sign In
        </button>
      </p>
    </div>
  );
}

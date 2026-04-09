import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { MOCK_ASSESSMENTS, MOCK_ASSESSMENT_RESULTS } from "@/lib/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function TakeAssessment() {
  const assessmentId = window.location.pathname.split("/assessments/")[1];
  const { user } = useAuth();
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [started, setStarted] = useState(false);

  const assessment = MOCK_ASSESSMENTS.find((a) => a.id === assessmentId);
  const existingResult = MOCK_ASSESSMENT_RESULTS.find(
    (r) => r.assessment_id === assessmentId && r.user_email === user.email,
  );

  useEffect(() => {
    if (existingResult) {
      setResult(existingResult);
      setSubmitted(true);
    }
  }, []);

  useEffect(() => {
    if (!started || !assessment?.time_limit_minutes) return;
    setTimeLeft(assessment.time_limit_minutes * 60);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [started]);

  const handleSubmit = () => {
    if (!assessment?.questions?.length) {
      toast.error("No questions in this assessment");
      return;
    }
    let score = 0,
      total = 0;
    const answerArray = [];
    assessment.questions.forEach((q, i) => {
      total += q.points || 1;
      const selected = answers[i];
      answerArray.push({
        question_index: i,
        selected_answer: selected !== undefined ? selected : -1,
      });
      if (selected === q.correct_answer) score += q.points || 1;
    });
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const passed = percentage >= (assessment.passing_score || 70);
    const mockResult = {
      id: "new",
      assessment_id: assessmentId,
      assessment_title: assessment.title,
      user_email: user.email,
      answers: answerArray,
      score,
      total_points: total,
      percentage,
      passed,
      flags: [],
      time_taken_minutes:
        assessment.time_limit_minutes - Math.floor((timeLeft || 0) / 60),
    };
    setResult(mockResult);
    setSubmitted(true);
    if (passed) toast.success("Congratulations! You passed!");
    else
      toast.info(
        `You scored ${percentage}%. You need ${assessment.passing_score}% to pass.`,
      );
  };

  if (!assessment)
    return (
      <div className="p-8 text-center text-muted-foreground">
        Assessment not found.
      </div>
    );

  const questions = assessment.questions || [];
  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (submitted && result) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <Link
          to="/assessments"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <Card
          className={result.passed ? "border-emerald-200" : "border-red-200"}
        >
          <CardContent className="p-8 text-center">
            <div
              className={`h-16 w-16 rounded-full mx-auto mb-4 flex items-center justify-center ${result.passed ? "bg-emerald-100" : "bg-red-100"}`}
            >
              {result.passed ? (
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              ) : (
                <XCircle className="h-8 w-8 text-red-600" />
              )}
            </div>
            <h2 className="text-2xl font-bold">
              {result.passed ? "Congratulations!" : "Keep Learning!"}
            </h2>
            <p className="text-muted-foreground mt-2">
              You scored {result.percentage}% on {assessment.title}
            </p>
            <div className="flex items-center justify-center gap-6 mt-4 text-sm">
              <span>
                Score: {result.score}/{result.total_points}
              </span>
              <span>Time: {result.time_taken_minutes} min</span>
            </div>
            {result.passed && (
              <Badge className="bg-emerald-100 text-emerald-700 mt-4">
                Certificate Earned!
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <Link
          to="/assessments"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold">{assessment.title}</h2>
            <p className="text-muted-foreground mt-2">
              {assessment.description}
            </p>
            <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> {assessment.time_limit_minutes}{" "}
                minutes
              </span>
              <span>{questions.length} questions</span>
              <span>Pass: {assessment.passing_score}%</span>
            </div>
            {assessment.proctoring_enabled && (
              <p className="text-xs text-amber-600 mt-3 flex items-center justify-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Proctoring enabled
              </p>
            )}
            <Button
              className="mt-6"
              onClick={() => setStarted(true)}
              disabled={questions.length === 0}
            >
              {questions.length === 0
                ? "No questions available"
                : "Start Assessment"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-background py-2 z-10">
        <h2 className="font-bold">{assessment.title}</h2>
        <div className="flex items-center gap-3">
          {timeLeft !== null && (
            <Badge variant="outline" className="text-sm gap-1">
              <Clock className="h-3 w-3" /> {formatTime(timeLeft)}
            </Badge>
          )}
        </div>
      </div>
      <Progress
        value={(Object.keys(answers).length / questions.length) * 100}
        className="mb-6 h-1.5"
      />
      <div className="space-y-6">
        {questions.map((q, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <p className="font-medium text-sm mb-3">
                {i + 1}. {q.question}
              </p>
              <RadioGroup
                value={answers[i]?.toString()}
                onValueChange={(v) =>
                  setAnswers({ ...answers, [i]: parseInt(v) })
                }
              >
                {q.options?.map((opt, j) => (
                  <div key={j} className="flex items-center space-x-2 py-1">
                    <RadioGroupItem value={j.toString()} id={`q${i}-o${j}`} />
                    <Label htmlFor={`q${i}-o${j}`} className="text-sm">
                      {opt}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button className="w-full mt-6" onClick={handleSubmit}>
        Submit Assessment
      </Button>
    </div>
  );
}

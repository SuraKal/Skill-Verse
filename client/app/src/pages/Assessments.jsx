import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { MOCK_ASSESSMENTS, MOCK_ASSESSMENT_RESULTS } from '@/lib/mockData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { GraduationCap, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Assessments() {
  const { user } = useAuth();
  const assessments = MOCK_ASSESSMENTS.filter(a => a.status === 'published');
  const myResults = MOCK_ASSESSMENT_RESULTS.filter(r => r.user_email === user.email);

  const resultMap = {};
  myResults.forEach(r => { resultMap[r.assessment_id] = r; });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader title="Assessments" description="Test your knowledge and earn certificates" />
      {assessments.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No assessments available" description="Check back later." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assessments.map(assessment => {
            const result = resultMap[assessment.id];
            return (
              <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="h-5 w-5 text-primary" />
                    </div>
                    {result && (
                      <Badge className={result.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                        {result.passed ? 'Passed' : 'Failed'} - {result.percentage}%
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold">{assessment.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{assessment.description}</p>
                  <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {assessment.time_limit_minutes} min</span>
                    <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Pass: {assessment.passing_score}%</span>
                    {assessment.proctoring_enabled && (
                      <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Proctored</span>
                    )}
                  </div>
                  <Link to={`/assessments/${assessment.id}`}>
                    <Button className="w-full mt-4" size="sm" variant={result ? 'outline' : 'default'}>
                      {result ? 'View Results' : 'Take Assessment'}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
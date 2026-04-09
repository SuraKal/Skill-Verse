import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { MOCK_CERTIFICATES } from '@/lib/mockData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Award, Shield } from 'lucide-react';
import { format } from 'date-fns';

export default function Certificates() {
  const { user } = useAuth();
  const [verifyCode, setVerifyCode] = useState('');
  const [verified, setVerified] = useState(null);

  const certificates = MOCK_CERTIFICATES.filter(c => c.user_email === user.email);

  const handleVerify = () => {
    const found = MOCK_CERTIFICATES.find(c => c.verification_code === verifyCode);
    setVerified(found || null);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader title="Certificates" description="Your earned certificates and verification" />

      <Card className="mb-8">
        <CardContent className="p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Shield className="h-4 w-4 text-primary" /> Verify a Certificate</h3>
          <div className="flex gap-2">
            <Input placeholder="Enter verification code..." value={verifyCode} onChange={e => setVerifyCode(e.target.value)} className="max-w-sm" />
            <Button onClick={handleVerify} disabled={!verifyCode}>Verify</Button>
          </div>
          {verified !== null && (
            <div className="mt-3">
              {verified ? (
                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                  <p className="text-emerald-700 font-medium">✓ Valid Certificate</p>
                  <p className="text-sm text-muted-foreground mt-1">Issued to {verified.user_name} for {verified.course_title} on {verified.issue_date}</p>
                </div>
              ) : (
                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                  <p className="text-red-700 font-medium">✗ Invalid Code</p>
                  <p className="text-sm text-muted-foreground mt-1">No certificate found with this verification code.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <h3 className="font-semibold mb-4">My Certificates</h3>
      {certificates.length === 0 ? (
        <EmptyState icon={Award} title="No certificates yet" description="Complete assessments and courses to earn certificates." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {certificates.map(cert => (
            <Card key={cert.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent" />
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                  <Badge className={cert.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>{cert.status}</Badge>
                </div>
                <h3 className="font-semibold">{cert.course_title}</h3>
                <p className="text-sm text-muted-foreground mt-1">Issued by {cert.issuer_name}</p>
                <p className="text-xs text-muted-foreground mt-1">{cert.issue_date && format(new Date(cert.issue_date), 'MMM d, yyyy')}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {cert.skills_certified?.map((s, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">{s}</Badge>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground">Verification Code</p>
                  <p className="text-sm font-mono font-medium">{cert.verification_code}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
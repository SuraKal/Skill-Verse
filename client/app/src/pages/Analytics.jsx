import React from 'react';
import { MOCK_ALL_USERS, MOCK_COURSES, MOCK_ENROLLMENTS, MOCK_JOBS, MOCK_EVENTS, MOCK_CERTIFICATES, MOCK_COMMUNITIES } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, BookOpen, Briefcase, Award, Calendar, TrendingUp, BarChart3 } from 'lucide-react';

const COLORS = ['hsl(245, 58%, 51%)', 'hsl(262, 83%, 58%)', 'hsl(173, 58%, 39%)', 'hsl(43, 74%, 66%)', 'hsl(12, 76%, 61%)'];

export default function Analytics() {
  const roleData = ['admin', 'mentor', 'user', 'company'].map(role => ({
    name: role.charAt(0).toUpperCase() + role.slice(1),
    value: MOCK_ALL_USERS.filter(u => u.role === role).length
  })).filter(d => d.value > 0);

  const categoryMap = {};
  MOCK_COURSES.forEach(c => { categoryMap[c.category] = (categoryMap[c.category] || 0) + 1; });
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name: name?.charAt(0).toUpperCase() + name?.slice(1), value }));

  const enrollmentStatus = ['enrolled', 'in_progress', 'completed', 'dropped'].map(s => ({
    name: s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: MOCK_ENROLLMENTS.filter(e => e.status === s).length
  })).filter(d => d.value > 0);

  const jobTypeMap = {};
  MOCK_JOBS.forEach(j => { const t = j.type?.replace('_', ' ') || 'other'; jobTypeMap[t] = (jobTypeMap[t] || 0) + 1; });
  const jobTypeData = Object.entries(jobTypeMap).map(([name, value]) => ({ name, value }));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader title="Analytics & Reports" description="Platform insights and engagement data" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={MOCK_ALL_USERS.length} icon={Users} />
        <StatCard title="Courses" value={MOCK_COURSES.length} icon={BookOpen} />
        <StatCard title="Jobs Posted" value={MOCK_JOBS.length} icon={Briefcase} />
        <StatCard title="Certificates Issued" value={MOCK_CERTIFICATES.length} icon={Award} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Enrollments" value={MOCK_ENROLLMENTS.length} icon={TrendingUp} />
        <StatCard title="Events" value={MOCK_EVENTS.length} icon={Calendar} />
        <StatCard title="Communities" value={MOCK_COMMUNITIES.length} icon={Users} />
        <StatCard title="Completed Courses" value={MOCK_ENROLLMENTS.filter(e => e.status === 'completed').length} icon={BarChart3} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">User Roles Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={roleData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Courses by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(245, 58%, 51%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Enrollment Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={enrollmentStatus} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {enrollmentStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Job Types</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={jobTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
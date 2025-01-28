// import React from 'react';
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
// import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
// import { BookOpen, Award, Activity, Bell } from 'lucide-react';

// const DashboardScreen = () => {
//   // Sample progress data
//   const progressData = [
//     { module: 'Compute', completed: 85 },
//     { module: 'Storage', completed: 70 },
//     { module: 'Database', completed: 60 },
//     { module: 'Security', completed: 90 },
//     { module: 'Networking', completed: 75 },
//   ];

//   const features = [
//     {
//       icon: <BookOpen className="w-8 h-8 text-blue-500" />,
//       title: 'Learning Modules',
//       description: 'Interactive GCP concepts with AI-powered content',
//     },
//     {
//       icon: <Activity className="w-8 h-8 text-green-500" />,
//       title: 'Progress Tracking',
//       description: 'Real-time progress monitoring across modules',
//     },
//     {
//       icon: <Award className="w-8 h-8 text-purple-500" />,
//       title: 'Certifications',
//       description: 'Comprehensive exam preparation paths',
//     },
//     {
//       icon: <Bell className="w-8 h-8 text-orange-500" />,
//       title: 'Smart Notifications',
//       description: 'AI-driven learning reminders and updates',
//     }
//   ];

//   return (
//     <div className="space-y-6 p-6 max-w-4xl mx-auto">
//       <Card>
//         <CardHeader>
//           <CardTitle>Cloud Explorer Features</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//             {features.map((feature, index) => (
//               <div key={index} className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
//                 {feature.icon}
//                 <h3 className="mt-2 font-semibold text-center">{feature.title}</h3>
//                 <p className="text-sm text-gray-600 text-center mt-1">{feature.description}</p>
//               </div>
//             ))}
//           </div>
//         </CardContent>
//       </Card>

//       <Card>
//         <CardHeader>
//           <CardTitle>Learning Progress</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <div className="h-64">
//             <ResponsiveContainer width="100%" height="100%">
//               <BarChart data={progressData}>
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis dataKey="module" />
//                 <YAxis />
//                 <Tooltip />
//                 <Bar dataKey="completed" fill="#3b82f6" name="Completion %" />
//               </BarChart>
//             </ResponsiveContainer>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// };

// export default DashboardScreen;
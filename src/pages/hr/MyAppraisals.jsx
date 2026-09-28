import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, Target, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { hrApi } from '../../api/hr';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import Loader from '../../components/Loader';

export default function MyAppraisals() {
  const qc = useQueryClient();
  const [openAppraisal, setOpenAppraisal] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-appraisals'],
    queryFn: () => hrApi.appraisals.myAppraisals(),
  });

  if (isLoading) return <Loader />;

  const appraisals = data || [];

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Award className="w-5 h-5" /> My Performance Appraisals
        </h2>
        <p className="text-purple-100 text-sm mt-1">
          Track your KPIs and complete self-assessments
        </p>
      </div>

      {appraisals.length === 0 ? (
        <div className="card p-12 text-center">
          <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No appraisals assigned yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {appraisals.map((a) => (
            <div
              key={a.id}
              className="card hover:border-blue-300 cursor-pointer transition"
              onClick={() => setOpenAppraisal(a)}
            >
              <div className="card-header">
                <div>
                  <h3 className="font-semibold text-slate-800">{a.cycle_name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Supervisor: {a.supervisor_name || '—'}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <div className="card-body">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">KPIs assigned:</span>
                  <span className="font-medium">{a.kpis?.length || 0}</span>
                </div>
                {a.overall_rating && (
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-slate-500">Overall Rating:</span>
                    <span className="font-bold text-blue-700 text-lg">{a.overall_rating} / 5</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <SelfAssessmentModal
        appraisal={openAppraisal}
        onClose={() => setOpenAppraisal(null)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['my-appraisals'] });
          setOpenAppraisal(null);
        }}
      />
    </div>
  );
}


function SelfAssessmentModal({ appraisal, onClose, onSuccess }) {
  const [kpis, setKpis] = useState([]);
  const [comments, setComments] = useState('');

  const { data: fresh } = useQuery({
    queryKey: ['appraisal-detail', appraisal?.id],
    queryFn: () => hrApi.appraisals.get(appraisal.id),
    enabled: !!appraisal?.id,
  });

  if (!appraisal) return null;
  const a = fresh || appraisal;

  const currentKpis = kpis.length
    ? kpis
    : (a.kpis || []).map((k) => ({
        id: k.id,
        title: k.title,
        description: k.description,
        target: k.target,
        weight: k.weight,
        self_rating: k.self_rating || '',
        self_comment: k.self_comment || '',
      }));

  const updateKpi = (id, field, value) => {
    setKpis(currentKpis.map((k) => (k.id === id ? { ...k, [field]: value } : k)));
  };

  const startMutation = useMutation({
    mutationFn: () => hrApi.appraisals.custom(a.id, 'start_self'),
    onSuccess: () => toast.success('Self-assessment started'),
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      hrApi.appraisals.custom(a.id, 'submit_self', {
        kpis: currentKpis.map((k) => ({
          id: k.id,
          self_rating: k.self_rating ? Number(k.self_rating) : null,
          self_comment: k.self_comment,
        })),
        self_comments: comments,
      }),
    onSuccess: () => {
      toast.success('Self-assessment submitted');
      onSuccess();
    },
    onError: () => toast.error('Failed to submit'),
  });

  const isReadOnly = !['NOT_STARTED', 'SELF_ASSESSMENT'].includes(a.status);

  return (
    <Modal open={!!appraisal} onClose={onClose} title={a.cycle_name} size="lg">
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Status</p>
          <div className="mt-1"><StatusBadge status={a.status} /></div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Supervisor</p>
          <p className="font-medium">{a.supervisor_name || '—'}</p>
        </div>
      </div>

      {a.status === 'NOT_STARTED' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5 text-sm">
          <p className="font-semibold text-blue-900">Ready to start your self-assessment?</p>
          <p className="text-blue-700 mt-1">Rate each KPI from 1 (below) to 5 (exceptional).</p>
          <button onClick={() => startMutation.mutate()} className="btn-primary mt-3" disabled={startMutation.isPending}>
            <Send className="w-4 h-4" /> Start Self-Assessment
          </button>
        </div>
      )}

      {currentKpis.length > 0 && a.status !== 'NOT_STARTED' && (
        <div className="space-y-3 mb-5">
          <h4 className="font-semibold text-slate-800 flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" /> KPIs
          </h4>
          {currentKpis.map((k) => (
            <div key={k.id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{k.title}</p>
                  {k.target && <p className="text-xs text-slate-500 mt-1"><strong>Target:</strong> {k.target}</p>}
                </div>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">Weight: {k.weight}%</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <FormField label="Self Rating (1-5)">
                  <input type="number" min="1" max="5" value={k.self_rating}
                    onChange={(e) => updateKpi(k.id, 'self_rating', e.target.value)}
                    className="input" disabled={isReadOnly} />
                </FormField>
                <div className="col-span-2">
                  <FormField label="Your Comment">
                    <input value={k.self_comment}
                      onChange={(e) => updateKpi(k.id, 'self_comment', e.target.value)}
                      className="input" placeholder="Explain" disabled={isReadOnly} />
                  </FormField>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {a.status === 'SELF_ASSESSMENT' && (
        <>
          <FormField label="Overall Comments">
            <textarea rows={3} value={comments || a.self_comments}
              onChange={(e) => setComments(e.target.value)}
              className="input" />
          </FormField>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} className="btn-primary">
              {submitMutation.isPending ? 'Submitting...' : 'Submit Self-Assessment'}
            </button>
          </div>
        </>
      )}

      {isReadOnly && (
        <>
          {a.self_comments && (
            <div className="bg-slate-50 rounded-lg p-3 mb-3">
              <p className="text-xs text-slate-500 uppercase mb-1">Your Comments</p>
              <p className="text-sm text-slate-700">{a.self_comments}</p>
            </div>
          )}
          {a.supervisor_comments && (
            <div className="bg-blue-50 rounded-lg p-3 mb-3">
              <p className="text-xs text-blue-700 uppercase mb-1">Supervisor Comments</p>
              <p className="text-sm text-slate-700">{a.supervisor_comments}</p>
            </div>
          )}
          {a.overall_rating && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-xs text-green-700 uppercase mb-1">Overall Rating</p>
              <p className="text-3xl font-bold text-green-700">{a.overall_rating}</p>
              <p className="text-xs text-green-600 mt-1">out of 5</p>
            </div>
          )}
          <div className="flex justify-end mt-4">
            <button onClick={onClose} className="btn-secondary">Close</button>
          </div>
        </>
      )}
    </Modal>
  );
}
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Star, Eye } from 'lucide-react';
import { getTemplates, deleteTemplate, setDefaultTemplate } from '../../api/templates';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Modal from '../../components/UI/Modal';
import Badge from '../../components/UI/Badge';
import ConfirmDialog from '../../components/UI/ConfirmDialog';
import InvoiceRenderer from '../../components/InvoiceRenderer';
import toast from 'react-hot-toast';

export default function InvoiceTemplates() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleteId, setDeleteId] = useState(null);
  const [previewTpl, setPreviewTpl] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['invoice-templates'],
    queryFn: () => getTemplates().then(r => r.data),
  });
  const templates = data?.results || data || [];

  const deleteMut = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => { toast.success('Template deleted'); qc.invalidateQueries(['invoice-templates']); setDeleteId(null); },
  });

  const defaultMut = useMutation({
    mutationFn: setDefaultTemplate,
    onSuccess: () => { toast.success('Default template updated'); qc.invalidateQueries(['invoice-templates']); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Invoice Templates</h2>
          <p className="text-sm text-gray-500 mt-0.5">Design custom invoice layouts with branding, variables, and full layout control.</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => navigate('/admin/invoice-templates/new')}>
          New Template
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-sm text-gray-400">Loading templates…</div>
      ) : templates.length === 0 ? (
        <Card>
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Plus className="w-6 h-6 text-indigo-600" />
            </div>
            <p className="text-gray-700 font-medium mb-1">No templates yet</p>
            <p className="text-sm text-gray-400 mb-5">Create your first invoice template with your logo, brand colors, and layout.</p>
            <Button onClick={() => navigate('/admin/invoice-templates/new')} icon={<Plus className="w-4 h-4" />}>
              Create Template
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {templates.map(tpl => (
            <Card key={tpl.id} className="flex flex-col p-0 overflow-hidden">
              {/* Scaled preview thumbnail */}
              <div
                className="bg-gray-50 overflow-hidden cursor-pointer relative group"
                style={{ height: 200 }}
                onClick={() => setPreviewTpl(tpl)}
              >
                <div className="origin-top-left pointer-events-none" style={{ transform: 'scale(0.265)', width: '377%', height: '377%' }}>
                  <InvoiceRenderer template={tpl} logoUrl={tpl.logo_url} />
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-all">
                  <div className="opacity-0 group-hover:opacity-100 bg-white/90 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow transition-all">
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </div>
                </div>
              </div>

              {/* Card footer */}
              <div className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm leading-tight">{tpl.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{tpl.config?.business_name || '—'}</p>
                  </div>
                  {tpl.is_default && <Badge color="indigo">Default</Badge>}
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    onClick={() => navigate(`/admin/invoice-templates/${tpl.id}/edit`)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  {!tpl.is_default && (
                    <button
                      onClick={() => defaultMut.mutate(tpl.id)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-amber-600 hover:bg-amber-50 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Star className="w-3.5 h-3.5" /> Set Default
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteId(tpl.id)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Preview modal */}
      <Modal open={!!previewTpl} onClose={() => setPreviewTpl(null)} title={`Preview: ${previewTpl?.name}`} size="xl">
        <div className="bg-gray-100 rounded-xl p-4 overflow-auto max-h-[75vh]">
          <div className="bg-white rounded-xl shadow">
            <InvoiceRenderer template={previewTpl} logoUrl={previewTpl?.logo_url} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMut.mutate(deleteId)}
        loading={deleteMut.isPending}
        title="Delete Template"
        message="Delete this invoice template? This cannot be undone."
      />
    </div>
  );
}

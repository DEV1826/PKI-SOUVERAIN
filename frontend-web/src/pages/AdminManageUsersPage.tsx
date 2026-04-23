import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { adminService } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLogin?: string;
}

export default function AdminManageUsersPage() {
  const user = useAuthStore((state) => state.user);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useToast();

  const pageSize = 20;

  useEffect(() => {
    loadUsers();
  }, [page]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminService.getUsers(page, pageSize);
      setUsers(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error: any) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      addToast({ type: 'error', message: 'Impossible de charger les utilisateurs' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (u: User) => {
    if (u.id === user?.id) {
      addToast({ type: 'error', message: 'Vous ne pouvez pas supprimer votre propre compte' });
      return;
    }
    setUserToDelete(u);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      await adminService.deleteUser(userToDelete.id);
      addToast({ type: 'success', message: `Utilisateur ${userToDelete.email} supprime avec succes` });
      setShowDeleteModal(false);
      setUserToDelete(null);
      loadUsers();
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      addToast({ type: 'error', message: error?.response?.data?.error || 'Erreur lors de la suppression' });
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-neutral-950 dark:to-neutral-900">
      <header className="border-b bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-h3 font-bold text-indigo-800 dark:text-indigo-300 sm:text-h2">Gestion des utilisateurs</h1>
            <p className="text-body-small text-neutral-600 dark:text-neutral-300">
              Supprimez ou gerez les utilisateurs du systeme
            </p>
          </div>
          <Link to="/admin/dashboard" className="flex items-center gap-2 text-sm text-indigo-600 underline hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-indigo-200">
            <ChevronLeft size={16} /> Retour au dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {loading ? (
          <div className="py-12 text-center text-neutral-600">Chargement...</div>
        ) : (
          <>
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                Total: <span className="font-semibold">{total}</span> utilisateur{total !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="overflow-hidden rounded-xl bg-white shadow dark:bg-neutral-900">
              <div className="max-h-[70vh] overflow-auto">
                <table className="min-w-[980px] w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 border-b bg-gray-100 dark:border-neutral-700 dark:bg-neutral-800">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-neutral-700">Email</th>
                      <th className="px-6 py-3 text-left font-semibold text-neutral-700">Nom</th>
                      <th className="px-6 py-3 text-left font-semibold text-neutral-700">Role</th>
                      <th className="px-6 py-3 text-left font-semibold text-neutral-700">Statut</th>
                      <th className="px-6 py-3 text-left font-semibold text-neutral-700">Cree le</th>
                      <th className="px-6 py-3 text-left font-semibold text-neutral-700">Derniere connexion</th>
                      <th className="px-6 py-3 text-center font-semibold text-neutral-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-neutral-600">
                          Aucun utilisateur trouve
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} className="transition-colors odd:bg-white even:bg-indigo-50/30 hover:bg-indigo-50/60">
                          <td className="px-6 py-4 font-mono text-sm text-neutral-800 dark:text-neutral-100">{u.email}</td>
                          <td className="px-6 py-4 text-sm text-neutral-800 dark:text-neutral-100">{u.firstName} {u.lastName}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`rounded px-2 py-1 text-xs font-semibold ${
                              u.role === 'ADMIN'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`rounded px-2 py-1 text-xs font-semibold ${
                              u.isActive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {u.isActive ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-300">{formatDate(u.createdAt)}</td>
                          <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-300">{formatDate(u.lastLogin)}</td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleDeleteClick(u)}
                              disabled={u.id === user?.id}
                              className={`inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-semibold transition ${
                                u.id === user?.id
                                  ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                            >
                              <Trash2 size={16} />
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft size={16} /> Precedent
                </Button>
                <span className="text-sm text-neutral-600">
                  Page {page + 1} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page === totalPages - 1}
                >
                  Suivant <ChevronRight size={16} />
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      {showDeleteModal && userToDelete && (
        <Modal
          open={true}
          title="Confirmer la suppression"
          onClose={() => setShowDeleteModal(false)}
        >
          <div className="space-y-4">
            <p className="text-neutral-700">
              Etes-vous sur de vouloir supprimer l'utilisateur <span className="font-bold">{userToDelete.email}</span> ?
            </p>
            <p className="text-sm text-red-600">
              Cette action est irreversible et supprimera tous les certificats et demandes associes.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                onClick={confirmDelete}
                loading={deleting}
              >
                Supprimer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

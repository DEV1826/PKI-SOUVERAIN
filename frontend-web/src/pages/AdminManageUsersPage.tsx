import { useEffect, useState } from 'react';
import { adminService } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { Link } from 'react-router-dom';
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

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
      addToast({ type: 'success', message: `Utilisateur ${userToDelete.email} supprimé avec succès` });
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <header className="bg-white border-b p-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-start">
          <div>
            <h1 className="text-h2 font-bold text-indigo-800">👥 Gestion des utilisateurs</h1>
            <p className="text-body-small text-neutral-600">
              Supprimez ou gérez les utilisateurs du système
            </p>
          </div>
          <Link to="/admin/dashboard" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 underline text-sm">
            <ChevronLeft size={16} /> Retour au dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8">
        {loading ? (
          <div className="text-center text-neutral-600 py-12">Chargement...</div>
        ) : (
          <>
            {/* Récapitulatif */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Total: <span className="font-semibold">{total}</span> utilisateur{total !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Tableau des utilisateurs */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-700">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-700">Nom</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-700">Rôle</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-700">Statut</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-700">Créé le</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-700">Dernière connexion</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-neutral-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-neutral-600">
                        Aucun utilisateur trouvé
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm text-neutral-800 font-mono">{u.email}</td>
                        <td className="px-6 py-4 text-sm text-neutral-800">{u.firstName} {u.lastName}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            u.role === 'ADMIN' 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            u.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {u.isActive ? '🟢 Actif' : '🔴 Inactif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-600">{formatDate(u.createdAt)}</td>
                        <td className="px-6 py-4 text-sm text-neutral-600">{formatDate(u.lastLogin)}</td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleDeleteClick(u)}
                            disabled={u.id === user?.id}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold transition ${
                              u.id === user?.id
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6">
                <Button
                  variant="secondary"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft size={16} /> Précédent
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

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && userToDelete && (
        <Modal
          open={true}
          title="Confirmer la suppression"
          onClose={() => setShowDeleteModal(false)}
        >
          <div className="space-y-4">
            <p className="text-neutral-700">
              Êtes-vous sûr de vouloir supprimer l'utilisateur <span className="font-bold">{userToDelete.email}</span> ?
            </p>
            <p className="text-sm text-red-600">
              ⚠️ Cette action est irréversible et supprimera tous les certificats et demandes associés.
            </p>
            <div className="flex gap-3 justify-end">
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

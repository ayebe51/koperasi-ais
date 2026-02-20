<?php

namespace App\Http\Controllers\Member;

use App\Enums\MemberStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Member\StoreMemberRequest;
use App\Http\Requests\Member\UpdateMemberRequest;
use App\Http\Resources\MemberResource;
use App\Http\Traits\ApiResponse;
use App\Models\Member;
use App\Models\MemberEquity;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class MemberController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/members
     */
    public function index(Request $request): JsonResponse
    {
        $query = Member::with('equity');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        if ($request->has('unit_kerja')) {
            $query->where('unit_kerja', 'like', "%{$request->unit_kerja}%");
        }
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('member_number', 'like', "%{$search}%")
                    ->orWhere('nik', 'like', "%{$search}%");
            });
        }

        $members = $query->orderBy('name')->paginate($request->per_page ?? 15);

        return MemberResource::collection($members)->response();
    }

    /**
     * POST /api/members
     */
    public function store(StoreMemberRequest $request): JsonResponse
    {
        $member = DB::transaction(function () use ($request) {
            $member = Member::create([
                ...$request->validated(),
                'status' => MemberStatus::ACTIVE,
            ]);

            MemberEquity::create(['member_id' => $member->id]);

            return $member->load('equity');
        });

        return $this->created(new MemberResource($member), 'Anggota berhasil ditambahkan');
    }

    /**
     * GET /api/members/{id}
     */
    public function show(string $id): JsonResponse
    {
        $member = Member::with(['equity', 'savings', 'loans'])->findOrFail($id);

        return $this->success([
            'member' => new MemberResource($member),
            'savings_summary' => [
                'simpanan_pokok' => $member->getSavingBalance('POKOK'),
                'simpanan_wajib' => $member->getSavingBalance('WAJIB'),
                'simpanan_sukarela' => $member->getSavingBalance('SUKARELA'),
            ],
            'active_loans' => $member->loans()->where('status', 'ACTIVE')->get(),
        ]);
    }

    /**
     * PUT /api/members/{id}
     */
    public function update(UpdateMemberRequest $request, string $id): JsonResponse
    {
        $member = Member::findOrFail($id);
        $member->update($request->validated());

        return $this->success(new MemberResource($member->fresh()->load('equity')), 'Data anggota berhasil diperbarui');
    }

    /**
     * DELETE /api/members/{id}
     */
    public function destroy(string $id): JsonResponse
    {
        $member = Member::findOrFail($id);

        if ($member->loans()->where('status', 'ACTIVE')->exists()) {
            return $this->error('Anggota tidak dapat dihapus karena masih memiliki pinjaman aktif', 422);
        }

        $member->update(['status' => MemberStatus::KELUAR]);
        $member->delete();

        return $this->success(null, 'Anggota berhasil dinonaktifkan');
    }

    /**
     * POST /api/members/{id}/create-account
     * Create a portal login account for a member
     */
    public function createPortalAccount(string $id): JsonResponse
    {
        $member = Member::findOrFail($id);

        if ($member->user_id) {
            return $this->error('Anggota ini sudah memiliki akun portal', 422);
        }

        // Use member's email, or generate one from member_number
        $email = $member->email ?: strtolower(str_replace([' ', '/'], ['-', '-'], $member->member_number)) . '@koperasi.local';

        // Check email uniqueness
        if (User::where('email', $email)->exists()) {
            return $this->error("Email {$email} sudah digunakan oleh user lain", 422);
        }

        // Default password = member_number
        $defaultPassword = $member->member_number;

        $user = DB::transaction(function () use ($member, $email, $defaultPassword) {
            $user = User::create([
                'name' => $member->name,
                'email' => $email,
                'password' => Hash::make($defaultPassword),
                'role' => UserRole::MEMBER,
            ]);

            $member->update(['user_id' => $user->id]);

            return $user;
        });

        return $this->created([
            'user_id' => $user->id,
            'email' => $email,
            'default_password' => $defaultPassword,
            'member_name' => $member->name,
        ], 'Akun portal berhasil dibuat');
    }
}

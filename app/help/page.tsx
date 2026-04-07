"use client";

import MainLayout from "@/components/MainLayout";
import RoleGuard from "@/components/RoleGuard";

export default function HelpPage() {
  return (
    <RoleGuard allowedRoles={["Encoder"]}>
      <MainLayout>
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Help & Guide</h1>
          <p className="mt-2 text-lg text-gray-600">
            Step-by-step instructions for encoding documents
          </p>
        </div>

        {/* Help Sections */}
        <div className="space-y-6">
          {/* How to Encode a Document */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
            <h2 className="mb-4 text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <span>📝</span>
              <span>How to Encode a New Document</span>
            </h2>
            <ol className="space-y-3 text-base text-gray-700 list-decimal list-inside">
              <li>
                Click on <strong>&quot;Encode Document&quot;</strong> in the sidebar menu
              </li>
              <li>
                Fill in all required fields marked with a red asterisk (*)
              </li>
              <li>
                Select the <strong>Department Out</strong> from the dropdown
              </li>
              <li>
                Enter the <strong>Type of Document</strong> (e.g., DV, PO, PR)
              </li>
              <li>
                Enter the <strong>Pay Claimant</strong> name (who will receive payment)
              </li>
              <li>
                Enter the <strong>Amount</strong> in pesos
              </li>
              <li>
                Write a clear <strong>Particular</strong> describing what the document is for
              </li>
              <li>
                Select the current <strong>Status</strong> (e.g., &quot;For Review&quot; or &quot;For Signature&quot;)
              </li>
              <li>
                Click <strong>&quot;Create Document&quot;</strong> to save
              </li>
            </ol>
          </div>

          {/* Understanding Document Codes */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
            <h2 className="mb-4 text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <span>🔢</span>
              <span>Understanding Document Codes</span>
            </h2>
            <p className="mb-3 text-base text-gray-700">
              Every document gets a unique code automatically. The format is:
            </p>
            <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
              <p className="font-mono text-lg font-semibold text-blue-900">
                CH-YYYY-DEPT-XXXX
              </p>
            </div>
            <ul className="mt-4 space-y-2 text-base text-gray-700 list-disc list-inside">
              <li>
                <strong>CH</strong> = City Hall (always the same)
              </li>
              <li>
                <strong>YYYY</strong> = Year (e.g., 2026)
              </li>
              <li>
                <strong>DEPT</strong> = Department Out code (e.g., BUDG, TREAS)
              </li>
              <li>
                <strong>XXXX</strong> = Sequential number (0001, 0002, etc.)
              </li>
            </ul>
            <p className="mt-4 text-base text-gray-600">
              <strong>Note:</strong> You don&apos;t need to create this code - it&apos;s generated automatically!
            </p>
          </div>

          {/* Common Statuses */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
            <h2 className="mb-4 text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <span>📊</span>
              <span>Understanding Document Status</span>
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-xl">{"\u2022"}</span>
                <div>
                  <strong className="text-base text-gray-900">For Signature</strong>
                  <p className="text-base text-gray-600">
                    Document is waiting for a required signature
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">{"\u2022"}</span>
                <div>
                  <strong className="text-base text-gray-900">For Review</strong>
                  <p className="text-base text-gray-600">
                    Document is under review by the assigned office
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">{"\u2022"}</span>
                <div>
                  <strong className="text-base text-gray-900">For Initial</strong>
                  <p className="text-base text-gray-600">
                    Document is waiting for initials or preliminary approval
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">{"\u2022"}</span>
                <div>
                  <strong className="text-base text-gray-900">For Schedule</strong>
                  <p className="text-base text-gray-600">
                    Document is queued for scheduling or processing date
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">{"\u2022"}</span>
                <div>
                  <strong className="text-base text-gray-900">Signed</strong>
                  <p className="text-base text-gray-600">
                    Document has been signed by the authorized official
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">{"\u2022"}</span>
                <div>
                  <strong className="text-base text-gray-900">Filed</strong>
                  <p className="text-base text-gray-600">
                    Document has been filed and recorded
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">{"\u2022"}</span>
                <div>
                  <strong className="text-base text-gray-900">Returned</strong>
                  <p className="text-base text-gray-600">
                    Document was returned for corrections or follow-up
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">{"\u2022"}</span>
                <div>
                  <strong className="text-base text-gray-900">Hold</strong>
                  <p className="text-base text-gray-600">
                    Document is temporarily on hold
                  </p>
                </div>
              </div>
</div>
          </div>

          {/* Tips */}
          <div className="rounded-xl bg-green-50 p-6 border-2 border-green-200">
            <h2 className="mb-4 text-2xl font-semibold text-green-900 flex items-center gap-2">
              <span>💡</span>
              <span>Tips for Accurate Encoding</span>
            </h2>
            <ul className="space-y-2 text-base text-green-800 list-disc list-inside">
              <li>Double-check all amounts before saving</li>
              <li>Use clear and complete descriptions in the &quot;Particular&quot; field</li>
              <li>Select the correct Department Out - this affects the document code</li>
              <li>If you make a mistake, you can edit the document later</li>
              <li>Contact your supervisor if you&apos;re unsure about any field</li>
            </ul>
          </div>

          {/* Contact */}
          <div className="rounded-xl bg-blue-50 p-6 border-2 border-blue-200">
            <h2 className="mb-4 text-2xl font-semibold text-blue-900 flex items-center gap-2">
              <span>📞</span>
              <span>Need More Help?</span>
            </h2>
            <p className="text-base text-blue-800">
              If you encounter any issues or have questions, please contact your system administrator or supervisor.
            </p>
          </div>
        </div>
      </MainLayout>
    </RoleGuard>
  );
}


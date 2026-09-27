"use client";

import { useEffect, useState } from "react";
import { request, Envelope } from "@/lib/http";
import { formatRupiah } from "@/lib/format";
import { SectionHeading } from "@/components/kriya/section-heading";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ShippingMethod {
  id: string;
  code: string;
  name_i18n: Record<string, string>;
  rate_type: string;
  base_cost: number;
  per_kg_cost: number;
  max_weight_kg: number | null;
  free_shipping_min_subtotal: number | null;
  eta_min_days: number;
  eta_max_days: number;
  is_active: boolean;
}

interface ShippingZone {
  id: string;
  code: string;
  name_i18n: Record<string, string>;
  is_active: boolean;
  provinces: string[];
  methods: ShippingMethod[];
}

export default function AdminShippingPage() {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMethod, setEditMethod] = useState<ShippingMethod | null>(null);
  
  const [formBaseCost, setFormBaseCost] = useState(0);
  const [formPerKgCost, setFormPerKgCost] = useState(0);
  const [formFreeMin, setFormFreeMin] = useState<number | "">("");
  const [formSaveLoading, setFormSaveLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchIt = async () => {
      setLoading(true);
      try {
        const res = await request<Envelope<ShippingZone[]>>("/api/v1/admin/shipping/zones", { auth: true });
        if (mounted) setZones(res.data || []);
      } catch (e) {
        console.error(e);
      }
      if (mounted) setLoading(false);
    };
    fetchIt();
    return () => { mounted = false; };
  }, []);

  const fetchZones = async () => {
    setLoading(true);
    try {
      const res = await request<Envelope<ShippingZone[]>>("/api/v1/admin/shipping/zones", { auth: true });
      setZones(res.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleEdit = (m: ShippingMethod) => {
    setEditMethod(m);
    setFormBaseCost(m.base_cost);
    setFormPerKgCost(m.per_kg_cost);
    setFormFreeMin(m.free_shipping_min_subtotal ?? "");
  };

  const saveEdit = async () => {
    if (!editMethod) return;
    setFormSaveLoading(true);
    try {
      await request(`/api/v1/admin/shipping/methods/${editMethod.id}`, {
        method: "PUT",
        auth: true,
        body: {
          base_cost: formBaseCost,
          per_kg_cost: formPerKgCost,
          free_shipping_min_subtotal: formFreeMin === "" ? -1 : Number(formFreeMin) // backend turns <=0 to NULL
        }
      });
      setEditMethod(null);
      await fetchZones();
    } catch (e) {
      console.error(e);
    }
    setFormSaveLoading(false);
  };

  return (
    <div className="space-y-6 p-6">
      <SectionHeading title="Pengaturan Pengiriman" subtitle="Kelola zona, provinsi, dan metode pengiriman." />
      
      {loading ? (
        <div>Loading...</div>
      ) : (
        zones.map((zone) => (
          <div key={zone.id} className="border rounded-lg bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold leading-none tracking-tight">
                  {zone.name_i18n.id || zone.name_i18n.en || zone.code}
                </h3>
                {!zone.is_active && <Badge variant="secondary">Nonaktif</Badge>}
              </div>
              <div className="flex flex-wrap gap-1 mt-2 mb-4">
                {zone.provinces.map((prov) => (
                  <Badge key={prov} variant="outline" className="text-xs">
                    {prov}
                  </Badge>
                ))}
              </div>
              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metode</TableHead>
                      <TableHead>Tipe Tarif</TableHead>
                      <TableHead>Biaya Dasar</TableHead>
                      <TableHead>Biaya /kg</TableHead>
                      <TableHead>Syarat Gratis Ongkir</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zone.methods.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">
                          {m.name_i18n.id || m.name_i18n.en || m.code}
                          <div className="text-xs text-muted-foreground mt-1">
                            Estimasi {m.eta_min_days}-{m.eta_max_days} hari
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {m.rate_type === "flat" ? "Flat" : "Per Kg"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatRupiah(m.base_cost)}</TableCell>
                        <TableCell>
                          {m.rate_type === "per_kg" ? formatRupiah(m.per_kg_cost) : "-"}
                        </TableCell>
                        <TableCell>
                          {m.free_shipping_min_subtotal ? (
                            <span className="text-green-600">Min. {formatRupiah(m.free_shipping_min_subtotal)}</span>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(m)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ))
      )}

      <Dialog open={!!editMethod} onOpenChange={(open) => !open && setEditMethod(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Biaya Pengiriman</DialogTitle>
          </DialogHeader>
          {editMethod && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Biaya Dasar</Label>
                <Input 
                  type="number" 
                  value={formBaseCost} 
                  onChange={(e) => setFormBaseCost(Number(e.target.value))} 
                />
              </div>
              {editMethod.rate_type === "per_kg" && (
                <div className="space-y-2">
                  <Label>Biaya Tambahan Per Kg</Label>
                  <Input 
                    type="number" 
                    value={formPerKgCost} 
                    onChange={(e) => setFormPerKgCost(Number(e.target.value))} 
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Minimum Subtotal Gratis Ongkir</Label>
                <Input 
                  type="number" 
                  placeholder="Kosongkan jika tidak ada"
                  value={formFreeMin} 
                  onChange={(e) => setFormFreeMin(e.target.value ? Number(e.target.value) : "")} 
                />
              </div>
              <Button onClick={saveEdit} disabled={formSaveLoading} className="w-full">
                {formSaveLoading ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

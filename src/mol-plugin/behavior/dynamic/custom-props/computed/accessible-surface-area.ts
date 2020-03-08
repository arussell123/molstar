/**
 * Copyright (c) 2019 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */

import { PluginBehavior } from '../../../behavior';
import { ParamDefinition as PD } from '../../../../../mol-util/param-definition';
import { AccessibleSurfaceAreaProvider } from '../../../../../mol-model-props/computed/accessible-surface-area';
import { Loci } from '../../../../../mol-model/loci';
import { AccessibleSurfaceAreaColorThemeProvider } from '../../../../../mol-model-props/computed/themes/accessible-surface-area';
import { OrderedSet } from '../../../../../mol-data/int';
import { arraySum } from '../../../../../mol-util/array';
import { DefaultQueryRuntimeTable } from '../../../../../mol-script/runtime/query/compiler';

export const AccessibleSurfaceArea = PluginBehavior.create<{ autoAttach: boolean, showTooltip: boolean }>({
    name: 'computed-accessible-surface-area-prop',
    category: 'custom-props',
    display: { name: 'Accessible Surface Area' },
    ctor: class extends PluginBehavior.Handler<{ autoAttach: boolean, showTooltip: boolean }> {
        private provider = AccessibleSurfaceAreaProvider

        private label = (loci: Loci): string | undefined => {
            if (!this.params.showTooltip) return
            return accessibleSurfaceAreaLabel(loci)
        }

        update(p: { autoAttach: boolean, showTooltip: boolean }) {
            let updated = (
                this.params.autoAttach !== p.autoAttach ||
                this.params.showTooltip !== p.showTooltip
            )
            this.params.autoAttach = p.autoAttach;
            this.params.showTooltip = p.showTooltip;
            this.ctx.customStructureProperties.setDefaultAutoAttach(this.provider.descriptor.name, this.params.autoAttach);
            return updated;
        }

        register(): void {
            DefaultQueryRuntimeTable.addCustomProp(this.provider.descriptor);

            this.ctx.customStructureProperties.register(this.provider, this.params.autoAttach);
            this.ctx.structureRepresentation.themeCtx.colorThemeRegistry.add('accessible-surface-area', AccessibleSurfaceAreaColorThemeProvider)
            this.ctx.lociLabels.addProvider(this.label);
        }

        unregister() {
            // TODO
            // DefaultQueryRuntimeTable.removeCustomProp(this.provider.descriptor);

            this.ctx.customStructureProperties.unregister(this.provider.descriptor.name);
            this.ctx.structureRepresentation.themeCtx.colorThemeRegistry.remove('accessible-surface-area')
            this.ctx.lociLabels.removeProvider(this.label);
        }
    },
    params: () => ({
        autoAttach: PD.Boolean(false),
        showTooltip: PD.Boolean(true)
    })
});

function accessibleSurfaceAreaLabel(loci: Loci): string | undefined {
    if(loci.kind === 'element-loci') {
        if (loci.elements.length === 0) return;

        const accessibleSurfaceArea = AccessibleSurfaceAreaProvider.get(loci.structure).value
        if (!accessibleSurfaceArea || loci.structure.customPropertyDescriptors.hasReference(AccessibleSurfaceAreaProvider.descriptor)) return;

        const { getSerialIndex } = loci.structure.root.serialMapping
        const { area, serialResidueIndex } = accessibleSurfaceArea
        const seen = new Set<number>()
        let cummulativeArea = 0

        for (const { indices, unit } of loci.elements) {
            const { elements } = unit

            OrderedSet.forEach(indices, idx => {
                const rSI = serialResidueIndex[getSerialIndex(unit, elements[idx])]
                if (rSI !== -1 && !seen.has(rSI)) {
                    cummulativeArea += area[rSI]
                    seen.add(rSI)
                }
            })
        }
        if (seen.size === 0) return
        const residueCount = `<small>(${seen.size} ${seen.size > 1 ? 'Residues sum' : 'Residue'})</small>`

        return `Accessible Surface Area ${residueCount}: ${cummulativeArea.toFixed(2)} \u212B<sup>2</sup>`;

    } else if(loci.kind === 'structure-loci') {
        const accessibleSurfaceArea = AccessibleSurfaceAreaProvider.get(loci.structure).value
        if (!accessibleSurfaceArea || loci.structure.customPropertyDescriptors.hasReference(AccessibleSurfaceAreaProvider.descriptor)) return;

        return `Accessible Surface Area <small>(Whole Structure)</small>: ${arraySum(accessibleSurfaceArea.area).toFixed(2)} \u212B<sup>2</sup>`;
    }
}
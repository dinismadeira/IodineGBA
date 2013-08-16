"use strict";
/*
 * This file is part of IodineGBA
 *
 * Copyright (C) 2012-2013 Grant Galitz
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * version 2 as published by the Free Software Foundation.
 * The full license is available at http://www.gnu.org/licenses/gpl.html
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 */
function DynarecTHUMBAssemblerCore(pc, records) {
    this.pc = "0x" + pc.toString(16);
    this.records = records;
    this.compileInstructionMap();
    this.generateSpew();
}
DynarecTHUMBAssemblerCore.prototype.generateSpew = function () {
    var batched = "\t//Stub Code For Address " + this.pc + ":\n" +
    "\t//Ensure we're executing in THUMB mode and in cpu mode:\n" +
    "\tif (cpu.InTHUMB == false || (cpu.IOCore.systemStatus | 0) != 0) {\n" +
        "\t\tcpu.dynarec.findCache(" + this.pc + ").bailout();\n" +
        "\t\treturn;\n" +
    "\t}\n" +
    "\tvar thumb = cpu.THUMB;\n";
    batched += this.generatePipelineSpew();
    batched += this.generatePipelineSpew();
    var length = this.records.length;
    for (var index = 0; index < length; index++) {
        batched += this.generateBodySpew(this.records[index]);
    }
    done(batched);
}
DynarecTHUMBAssemblerCore.prototype.generatePipelineSpew = function () {
    return "\t//Ensure we do not run when an IRQ is flagged or not in cpu mode:\n" +
    "\tif (cpu.processIRQ || (cpu.IOCore.systemStatus | 0) != 0) {\n" +
        "\t\tcpu.dynarec.findCache(" + this.pc + ").tickBad();\n" +
        "\t\treturn;\n" +
	"\t}\n" +
    "\t//Tick the CPU pipeline:\n" +
	"\tcpu.pipelineInvalid >>= 1;\n" +
    "\tthumb.fetch = cpu.wait.CPUGetOpcode16(cpu.registers[15] | 0) | 0;\n" +
    "\t//Waiting for the pipeline bubble to clear...\n" +
    "\tthumb.execute = thumb.decode | 0;\n" +
    "\tthumb.decode = thumb.fetch | 0;\n" +
	"\tthumb.incrementProgramCounter();\n";
}
DynarecTHUMBAssemblerCore.prototype.generateBodySpew = function (instruction) {
    instruction = instruction | 0;
    return "\t//Ensure we do not run when an IRQ is flagged or not in cpu mode:\n" +
    "\tif (cpu.processIRQ || (cpu.IOCore.systemStatus | 0) != 0) {\n" +
        "\t\tcpu.dynarec.findCache(" + this.pc + ").tickBad();\n" +
        "\t\treturn;\n" +
	"\t}\n" +
    "\t//Verify the cached instruction should be called:\n" +
    "\tif ((thumb.execute | 0) != 0x" + instruction.toString(16) + ") {\n" +
        "\t\tcpu.dynarec.findCache(" + this.pc + ").bailout();\n" +
        "\t\treturn;\n" +
    "\t}\n" +
    "\t//Tick the CPU pipeline:\n" +
	"\tcpu.pipelineInvalid >>= 1;\n" +
    "\tthumb.fetch = cpu.wait.CPUGetOpcode16(cpu.registers[15] | 0) | 0;\n" +
    this.generateInstructionSpew(instruction | 0) +
    "\tthumb.execute = thumb.decode | 0;\n" +
    "\tthumb.decode = thumb.fetch | 0;\n" +
	"\tif ((cpu.pipelineInvalid | 0) == 0) {\n" +
        "\t\tthumb.incrementProgramCounter();\n" +
	"\t}\n" +
    "\telse {\n" +
        "\t\t//We branched, so exit normally:\n" +
        "\t\treturn;\n" +
	"\t}\n";
}
DynarecTHUMBAssemblerCore.prototype.generateInstructionSpew = function (instruction) {
    instruction = instruction | 0;
    return "\tthumb." + this.instructionMap[instruction >> 6] + "(thumb);\n";
}
DynarecTHUMBAssemblerCore.prototype.compileInstructionMap = function () {
	this.instructionMap = [];
	//0-7
	this.generateLowMap("LSLimm");
	//8-F
	this.generateLowMap("LSRimm");
	//10-17
	this.generateLowMap("ASRimm");
	//18-19
	this.generateLowMap2("ADDreg");
	//1A-1B
	this.generateLowMap2("SUBreg");
	//1C-1D
	this.generateLowMap2("ADDimm3");
	//1E-1F
	this.generateLowMap2("SUBimm3");
	//20-27
	this.generateLowMap("MOVimm8");
	//28-2F
	this.generateLowMap("CMPimm8");
	//30-37
	this.generateLowMap("ADDimm8");
	//38-3F
	this.generateLowMap("SUBimm8");
	//40
	this.generateLowMap4("AND", "EOR", "LSL", "LSR");
	//41
	this.generateLowMap4("ASR", "ADC", "SBC", "ROR");
	//42
	this.generateLowMap4("TST", "NEG", "CMP", "CMN");
	//43
	this.generateLowMap4("ORR", "MUL", "BIC", "MVN");
	//44
	this.generateLowMap4("ADDH_LL", "ADDH_LH", "ADDH_HL", "ADDH_HH");
	//45
	this.generateLowMap4("CMPH_LL", "CMPH_LH", "CMPH_HL", "CMPH_HH");
	//46
	this.generateLowMap4("MOVH_LL", "MOVH_LH", "MOVH_HL", "MOVH_HH");
	//47
	this.generateLowMap4("BX_L", "BX_H", "BX_L", "BX_H");
	//48-4F
	this.generateLowMap("LDRPC");
	//50-51
	this.generateLowMap2("STRreg");
	//52-53
	this.generateLowMap2("STRHreg");
	//54-55
	this.generateLowMap2("STRBreg");
	//56-57
	this.generateLowMap2("LDRSBreg");
	//58-59
	this.generateLowMap2("LDRreg");
	//5A-5B
	this.generateLowMap2("LDRHreg");
	//5C-5D
	this.generateLowMap2("LDRBreg");
	//5E-5F
	this.generateLowMap2("LDRSHreg");
	//60-67
	this.generateLowMap("STRimm5");
	//68-6F
	this.generateLowMap("LDRimm5");
	//70-77
	this.generateLowMap("STRBimm5");
	//78-7F
	this.generateLowMap("LDRBimm5");
	//80-87
	this.generateLowMap("STRHimm5");
	//88-8F
	this.generateLowMap("LDRHimm5");
	//90-97
	this.generateLowMap("STRSP");
	//98-9F
	this.generateLowMap("LDRSP");
	//A0-A7
	this.generateLowMap("ADDPC");
	//A8-AF
	this.generateLowMap("ADDSP");
	//B0
	this.generateLowMap3("ADDSPimm7");
	//B1
	this.generateLowMap3("UNDEFINED");
	//B2
	this.generateLowMap3("UNDEFINED");
	//B3
	this.generateLowMap3("UNDEFINED");
	//B4
	this.generateLowMap3("PUSH");
	//B5
	this.generateLowMap3("PUSHlr");
	//B6
	this.generateLowMap3("UNDEFINED");
	//B7
	this.generateLowMap3("UNDEFINED");
	//B8
	this.generateLowMap3("UNDEFINED");
	//B9
	this.generateLowMap3("UNDEFINED");
	//BA
	this.generateLowMap3("UNDEFINED");
	//BB
	this.generateLowMap3("UNDEFINED");
	//BC
	this.generateLowMap3("POP");
	//BD
	this.generateLowMap3("POPpc");
	//BE
	this.generateLowMap3("UNDEFINED");
	//BF
	this.generateLowMap3("UNDEFINED");
	//C0-C7
	this.generateLowMap("STMIA");
	//C8-CF
	this.generateLowMap("LDMIA");
	//D0
	this.generateLowMap3("BEQ");
	//D1
	this.generateLowMap3("BNE");
	//D2
	this.generateLowMap3("BCS");
	//D3
	this.generateLowMap3("BCC");
	//D4
	this.generateLowMap3("BMI");
	//D5
	this.generateLowMap3("BPL");
	//D6
	this.generateLowMap3("BVS");
	//D7
	this.generateLowMap3("BVC");
	//D8
	this.generateLowMap3("BHI");
	//D9
	this.generateLowMap3("BLS");
	//DA
	this.generateLowMap3("BGE");
	//DB
	this.generateLowMap3("BLT");
	//DC
	this.generateLowMap3("BGT");
	//DD
	this.generateLowMap3("BLE");
	//DE
	this.generateLowMap3("UNDEFINED");
	//DF
	this.generateLowMap3("SWI");
	//E0-E7
	this.generateLowMap("B");
	//E8-EF
	this.generateLowMap("UNDEFINED");
	//F0-F7
	this.generateLowMap("BLsetup");
	//F8-FF
	this.generateLowMap("BLoff");
    //Force length to be ready only:
    Object.defineProperty(this.instructionMap, "length", {writable: false});
}
DynarecTHUMBAssemblerCore.prototype.generateLowMap = function (instruction) {
	for (var index = 0; index < 0x20; ++index) {
		this.instructionMap.push(instruction);
	}
}
DynarecTHUMBAssemblerCore.prototype.generateLowMap2 = function (instruction) {
	for (var index = 0; index < 0x8; ++index) {
		this.instructionMap.push(instruction);
	}
}
DynarecTHUMBAssemblerCore.prototype.generateLowMap3 = function (instruction) {
	for (var index = 0; index < 0x4; ++index) {
		this.instructionMap.push(instruction);
	}
}
DynarecTHUMBAssemblerCore.prototype.generateLowMap4 = function (instruction1, instruction2, instruction3, instruction4) {
	this.instructionMap.push(instruction1);
	this.instructionMap.push(instruction2);
	this.instructionMap.push(instruction3);
	this.instructionMap.push(instruction4);
}
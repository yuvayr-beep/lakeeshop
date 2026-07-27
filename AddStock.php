<?php
	include_once 'logincheck.php';
	include 'includes/Fns.php';

	if(!empty($_GET['Error'])){$err=$_GET['Error'];} else{ $err=""; }
	if(!empty($_GET['Success'])){ $Succ=$_GET['Success']; } else { $Succ=""; }

	//session_start();
	$sql4="SELECT * FROM `vsmanagesupplier` WHERE `vmsStatus`='1'";
	$result4=$mysqli->query($sql4);

	//$SNo=$_GET['Val'];
	$sqltax = "SELECT * FROM `vsproductsaletax` WHERE `Pststatus` = 1";
	$restax = $mysqli->query($sqltax);
	
	$result = false;
?>
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
		<title>Lakeeshop - Add Stock</title>i
		<meta name="description" content="Winkle is a Dashboard & Admin Site Responsive Template by hencework." />
		<meta name="keywords" content="admin, admin dashboard, admin template, cms, crm, Winkle Admin, Winkleadmin, premium admin templates, responsive admin, sass, panel, software, ui, visualization, web app, application" />
		<meta name="author" content="hencework"/>
		
		<!-- Favicon -->
		<link rel="shortcut icon" href="favicon.ico">
		<link rel="icon" href="favicon.ico" type="image/x-icon">
		
		<!-- vector map CSS -->
		<link href="../vendors/bower_components/jasny-bootstrap/dist/css/jasny-bootstrap.min.css" rel="stylesheet" type="text/css"/>
		
		<!-- Data table CSS -->
		<link href="../vendors/bower_components/datatables/media/css/jquery.dataTables.min.css" rel="stylesheet" type="text/css"/>
	
		<!-- Custom CSS -->
		<link href="dist/css/style.css" rel="stylesheet" type="text/css">
		<link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
	</head>
	<style>
		body {
		    color: #000000;
		    font-family: "Poppins", sans-serif;
		    font-size: 12px;
		    font-style: normal;
		    line-height: 1.5;
		    background: #192D46;
		    overflow-x: hidden;
		}
		.table > tbody > tr > td, .jsgrid-table > tbody > tr > td, .table > tbody > tr > th, .jsgrid-table > tbody > tr > th, .table > tfoot > tr > td, .jsgrid-table > tfoot > tr > td, .table > tfoot > tr > th, .jsgrid-table > tfoot > tr > th, .table > thead > tr > td, .jsgrid-table > thead > tr > td, .table > thead > tr > th, .jsgrid-table > thead > tr > th {
		    padding: 3px;
		    border-top: 2px solid #f5f5f5;
		    vertical-align: middle;
		}
		.pb-30 {
		    padding-bottom: 10px !important;
		}
		.btn.btn-circle, .fixed-sidebar-left .side-nav > li > a.btn-circle.documentation-btn, .wizard > .actions a.btn-circle, .dt-buttons .btn-circle.dt-button, .tablesaw-sortable th.tablesaw-sortable-head button.btn-circle, .sweet-alert button.btn-circle, .owl-theme .owl-nav .btn-circle[class*="owl-"], button.btn-circle.fc-agendaDay-button.fc-state-default.fc-corner-right, button.btn-circle.fc-month-button.fc-state-default.fc-corner-left, button.btn-circle.fc-agendaWeek-button, .btn-circle.fc-prev-button, .btn-circle.fc-next-button, .btn-circle.fc-today-button {
		    height: 32px;
		    width: 32px;
		    padding: 0;
		    border-radius: 50%;
		}
		.page-wrapper {
		    margin-left: 250px;
		    padding: 0px 20px;
		    position: relative;
		    background: #fff;
		    -webkit-transition: all 0.4s ease;
		    -moz-transition: all 0.4s ease;
		    transition: all 0.4s ease;
		    left: 0;
		}
		.card-view.panel .panel-body {
		    padding: 0px 0 0px;
		}
		.mb-10 {
		    margin-bottom: 10px !important;
		    margin-top: 10px;
		}
		.form-control {
		    border: 1px solid rgba(33, 33, 33, 0.32);
		    border-radius: 0;
		    background-color: #fff;
		    box-shadow: none;
		    color: #272B34;
		    height: 30px;
		    font-size: 14px;
		}
		hr {
		    margin-top: 10px;
		    margin-bottom: 0px;
		    border-top: 2px solid #4dad44;
		}
		.card-view {
		    background: #fffefe;
		    margin-bottom: 2px;
		    border: none;
		    border-radius: 3px;
		    box-shadow: 0 1px 18px rgba(0, 0, 0, 0.1);
		    padding: 15px 15px 0;
		}
		.card-view {
		    background: #fffefe;
		    margin-bottom: 2px;
		    border: none;
		    border-radius: 3px;
		    box-shadow: 0 1px 18px rgba(0, 0, 0, 0.1);
		    padding: 15px 15px 15px 15px;
		}
	</style>
	<body>
		<!--Preloader-->
		<div class="preloader-it">
			<div class="la-anim-1"></div>
		</div>
		<!--/Preloader-->
		<div class="wrapper theme-1-active navbar-top-chrome horizontal-nav">
			<!-- Main Content -->
			<div class="page-wrapper">
				<div class="container-fluid">
					<?php include 'widget/header.php'; ?>
					<div class="row" style="margin-top: 10px;">
						<div class="col-md-12">
							<div class="panel panel-default card-view">
								<div class="panel-wrapper collapse in">
									<div class="panel-body">
										<div class="row" style="margin-right: 0px;margin-left: 0px;">
											<div class="col-md-12">
												<div class="form-wrap">
													<div class="form-body">
													<center><span id="msg"></span></center>	
														<div class="pull-left">
															<h6 class="panel-title txt-dark">Add Stock</h6>
														</div><br>
														<hr class="light-grey-hr"/>
														<div class="row">
															<div class="col-md-4">
																<div class="form-group">
																	<label class="control-label mb-10">Supplier Name</label>
																	<select class="form-control js-example-basic-single" form='subForm' id="vsiSupRefID" name="vsiSupRefID">
																		<option value="0">Select</option>
																		<?php if($result4) { while($row4=$result4->fetch_assoc()) { echo "<option value='".$row4['vmsRefID']."' data-gsttype='".$row4['vmsGstType']."'>".$row4['vmsName']."</option>"; } } ?>
																	</select>
																</div>
															</div>
															<div class="col-md-2">
																<div class="form-group">
																	<label class="control-label mb-10">&nbsp;</label><br>
																	<button type="button" class="btn btn-success btn-icon-anim btn-square"  style="height: 30px;width: 30px;color:#fff;"><a href="#exampleModal" data-toggle="modal" ><i class="fa fa-plus" aria-hidden="true"></i></a></button>
																</div>
															</div>
															<div class="col-md-2" style="margin: 0 -15px;">
																<div class="form-group" style="margin: 0 -15px;">
																	<label class="control-label mb-10">PO NO</label>
																	<input type="text" form='subForm' class="form-control" id="vsiPONo" name="vsiPONo" required>
																</div>
															</div>
															<div class="col-md-2">
																<div class="form-group">
																	<label class="control-label mb-10">Invoice NO</label>
																	<input type="text" form='subForm' class="form-control" id="vsiInvNo" name="vsiInvNo" maxlength="16" required>
																</div>
															</div>
															<div class="col-md-2">
															    <!-- <div class="form-group">
															        <label class="control-label mb-10">Invoice Date</label>
															        <input type="date" form='subForm' class="form-control" 
															               id="vsiInvDate" name="vsiInvDate" 
															               value="<?php //echo date('Y-m-d'); ?>" 
															               max="<?php //echo date('Y-m-d'); ?>" required>
															    </div> -->

															    <div class="form-group">
																    <label class="control-label mb-10">Invoice Date</label>
																    <input type="date"
																           form="subForm"
																           class="form-control"
																           id="vsiInvDate"
																           name="vsiInvDate"
																           value="<?php echo date('Y-m-d'); ?>"
																           min="<?php echo date('Y-m-d', strtotime('-1 month')); ?>"
																           max="<?php echo date('Y-m-d'); ?>"
																           required>
																</div>

															</div>
															<!--/span-->
														</div>
														<div class="row">
															<div class="col-md-4">
																<div class="form-group">
																	<label class="control-label mb-10">GST Type</label>
																	<select class="form-control" form='subForm' id="vsiGstType" name="vsiGstType">
																		<option value="0">Local</option>
																		<option value="1">Outstation</option>
																	</select>
																</div>
															</div>
															<div class="col-md-4">
																<div class="form-group">
																	<label class="control-label mb-10">Supplier GST Number & Type</label>
																	<div class="form-control" style="height: auto; background-color: #f5f5f5; padding: 8px; border: 1px solid #ddd; border-radius: 3px;">
																		<div id="supplierGstInfo">
																			<p style="margin: 0; color: #999; font-size: 12px;">Select a supplier first</p>
																		</div>
																	</div>
																</div>
															</div>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>		
						</div>
					</div>
					<div class="row" style="margin-top: 10px;">
						<div class="col-md-12">
							<div class="panel panel-default card-view">
								<div class="panel-wrapper collapse in">
									<div class="panel-body">
										<div class="row">
											<div class="col-md-12">
												<div class="form-wrap">
													<div class="form-body">
														<div class="row">
															<div class="col-md-4">
																<div class="form-group">
																	<h6 class="txt-dark capitalize-font">Add Item</h6>
																</div>
															</div>
															<div class="col-md-4" style="padding-top: 10px;">
																<div class="form-group">
																	<!-- <label class="control-label col-md-3" style="color: #00761a;font-weight: 700;"> </label>
																	<div class="col-md-9">
																		<span style="color: #00761a;font-weight: 700;">Rs. <span id="price"></span></span>
																	</div> -->
																</div>
															</div>
															<div class="col-md-4" style="padding-top: 10px;">
																<div class="form-group">
																	<!-- <label class="control-label col-md-3" style="color: #00761a;font-weight: 700;"></label>
																	<div class="col-md-9">
																			<span style="color: #00761a;font-weight: 700;">Rs. <span id="perc"></span></span>
																	</div> -->
																</div>
															</div>
														</div>
														<hr class="light-grey-hr"/>
														<form id="addForm">
															<div class="row">
																<div class="col-md-6" style="padding-top: 10px;">
																	<div class="form-group">
																		<label class="control-label col-md-3">Item Name</label>
																		<div class="col-md-9">
																			<select class="form-control js-example-basic-single" id="vspRefID" name="vspRefID">
																			<option value="0">Select</option>
																			<?php   $sql5 =  "SELECT `vmRefID`,`vmProdName` FROM `vsmproduct` WHERE `vmStatus` = 1 AND `vmProdStatus` = 0 AND `vmIsCombo` = 0 AND `vmParentID` = 0 ORDER BY vmProdName ASC";
																			
																			$result5 = $mysqli->query($sql5);
																			if($result5){
																			while($row5=$result5->fetch_assoc()){
																				echo "<option value='$row5[vmRefID]'>$row5[vmProdName]</option>";
																			}} ?>
																			</select>
																		</div>
																	</div>
																</div>
																<div class="col-md-3" style="padding-top: 10px;">
																	<div class="form-group">
																		<label class="control-label col-md-3">Price</label>
																		<div class="col-md-9">
																			<input type="text" class="form-control" id="vsuPrice" name="vsuPrice" placeholder="price" >
																			<label class="control-label" style="color: #00761a;font-weight: 700;">Previous Price: Rs.<span id="price"></span></label>
																			<label class="control-label" style="color: #e28743;font-weight: 700;">Inclusive tax: Rs.<span id="princltax"></span></label>
																		</div>
																	</div>
																</div>
																<div class="col-md-3" style="padding-top: 10px;">
																	<div class="form-group">
																		<label class="control-label col-md-3"><strong>MRP*</strong></label>
																		<div class="col-md-6">
																			<input type="number" id="newMrp" name="newMrp" class="form-control" >
																			<label class="control-label" style="color: #00761a;font-weight: 700;">MRP: Rs.<span id="mrpspan"></span></label>
																			<input type="hidden" id="oldMrp" name="oldMrp" >
																			<input type="hidden" id="vsuTaxType" name="vsuTaxType" >
																			<!--<select class="form-control" id="vsuTaxType" name="vsuTaxType">
																				<option value="0">Select</option>
																				<option value="1">Other</option>
																			</select>-->
																		</div>
																		<div class="col-md-3">
																			<button type="button" id="updmrp" class="btn btn-warning btn-icon-anim btn-square"  style="height: 30px;width: 30px;color:#fff;" disabled><i class="fa fa-refresh" aria-hidden="true" style="color: black;"></i></button>
																		</div>
																	</div>
																</div>
															</div>
															<div class="row">
																<div class="col-md-3" style="padding-top: 10px;">
																	<div class="form-group">
																		<label class="control-label col-md-3">Item Code</label>
																		<div class="col-md-9">
																			<input type="text" id="ItemCode" name="ItemCode" class="form-control" readonly>
																			<label class="control-label" style="color: #0000e6;font-weight: 700;">Pending: <span id="penqty"></span></label>
																			<input type="hidden" id="vmRefID" name="vmRefID">
																		</div>
																	</div>
																</div>
																<div class="col-md-3" style="padding-top: 10px;">
																	<div class="form-group">
																		<label class="control-label col-md-3">Qty Received</label>
																		<div class="col-md-9">
																			<input type="text" class="form-control" id="vsuQtyRecd" name="vsuQtyRecd" required>
																			<label class="control-label" style="color: #f00;font-weight: 700;">Pre Order: <span id="preqty"></span></label>
																		</div>
																	</div>
																</div>
																<div class="col-md-3" style="padding-top: 10px;">
																	<div class="form-group">
																		<label class="control-label col-md-3">Tax%</label>
																		<div class="col-md-9">
																			<input type="text" id="vsuTaxPercent" name="vsuTaxPercent" class="form-control" readonly />
																			
																			<label class="control-label" style="color: #00761a;font-weight: 700;">Previous Tax: <span id="perc"></span>%</label>
																		</div>
																	</div>
																</div>
																<div class="col-md-3" style="padding-top: 10px;">
																	<div class="form-group">
																		<div class="col-md-12">
																			<button type="button" id="addBtn" class="btn btn-default pull-right">Add</button>
																		</div>
																	</div>
																</div>
															</div>
															<hr>
															<div class="row" style="padding-top:10px;">
																<div class="col-sm-12">
																	<!--<h6 class="panel-title txt-dark" style="padding-top: 7px;">PreOrder Details</h6>-->
																	<div class="panel-wrapper collapse in">
																		<div class="panel-body" style="padding-top: 0px;padding-bottom: 7px;">
																			<div class="table-wrap">
																				<div class="table-responsive">
																					<table id="preordtable" class="table table-hover display  pb-30" >
																						<thead>
																							<tr>
																								<th>Source<br>Name</th>
																								<th>Client<br>Order No</th>
																								<th>Order<br>Ref No</th>
																								<th>Pack<br>Ref No</th>
																								<th>Pack<br>Status</th>
																								<th>Courier<br>Name</th>
																								<th>Ship<br>Mode</th>
																								<th>Item<br>Qty</th>
																								<th>AWB No</th>
																								<th>Order<br>Date</th>
																								<th>AWB Assign<br>Date</th>
																								<th>Dispatched<br>Date</th>
																								<th>Pre Order<br>Date</th>
																							</tr>
																						</thead>
																						
																						<tbody>
																							<?php if($result){ if(isset($row['Orderid'])) {	do { ?>	
																							<tr>
																						
																							<td><?php
																									$sql1 = "SELECT `vmcCltName` FROM `vsmanageclient` WHERE `vmcCltRefID` = '".$row['vorCltRefID']."'";
																									$result1 = $mysqli->query($sql1);
																									$row1 = $result1->fetch_assoc();
																									echo $row1['vmcCltName']; ?>
																									</td>
																									
																							<td><?php echo $row['vorOrdRefNo']; ?></td>
																							<td><?php echo $row['vorPckRefNo']; ?></td>
																							<td><?php   
														                                        if($row['vorOrdHldStatus'] == '1') { 
														                                            echo "ORDER ON HOLD";
														                                        } elseif($row['vorStatus']=='1') {
																					                echo "STOCK ASSIGN PENDING";
																							    } elseif ($row['vorStatus']=='0') {
																						            echo "CANCELLED";
																						        } elseif($row['vorStatus']=='2') {
																						            echo "STOCK ASSIGNED";
																						        } elseif($row['vcasStatus']=='1') {
																						            echo "COURIER ASSIGNED";
																						        } elseif($row['vcasStatus']=='2') {
																						            echo "OUTSCANNED";
																						        } elseif($row['vcasStatus']=='3') {
																						            echo "COURIER RETURNED";
																						        } elseif($row['vcasStatus']=='4') {
																						            echo "DELIVERED";
																						        } elseif($row['vcasStatus']=='5') {
																						            echo "DELIVERY RETURNED";
																						        } elseif($row['vcasStatus']=='6') {
																						            echo "SALE RETURNED";
																						        } elseif($row['vcasStatus']=='7') {
																						            echo "COURIER LOST";
																						        } elseif($row['vcasStatus']=='8') {
																						            echo "COURIER & AWB ASSIGNED";
																						        } elseif($row['vcasStatus']=='9') {
																						            echo "PACKAGE CLOSED";
																						        } elseif($row['vcasStatus']=='10') {
																						            echo "COURIER BLOCKED";
																						        } elseif($row['vcasStatus']=='11') {
																						            echo "DEFECTIVE RETURNED";
																						        } elseif($row['vcasStatus']=='12') {
																						            echo "DAMAGE RETURNED";
																						        } elseif($row['vcasStatus']=='13') {
																						            echo "REVERSE PICKUP";
																						        } elseif($row['vcasStatus']=='14') {
																						            echo "NON REVERSE REPLACEMENT";
																						        } elseif($row['vcasStatus']=='15') {
																						            echo "EXPECTING RETURN";
																						        }
																							?></td>
																							<td><?php if(!($row['vcasAsgnVcoRefID'] == "")){
																							$sql2 = "SELECT `vcoName` FROM `vscourier` WHERE vcoRefID = '".$row['vcasAsgnVcoRefID']."'";
																							$res2 = $mysqli->query($sql2);
																							$row2 = $res2->fetch_assoc();
																							echo $row2['vcoName']; }?></td>
																							
																							<td><?php if($row['vcasAsgnShpMod'] == '1') {
																								echo "SYSTEM";
																							} elseif($row['vcasAsgnShpMod'] == '2') {
																								echo "DP";
																							} elseif($row['vcasAsgnShpMod'] == '3') {
																								echo "SURFACE";
																							}
																							?></td>
																							
																							<td width="12%"><?php echo $row['vorProdCode']; ?><br><?php echo $row['vorProdName']; ?></td>
																							<td><?php echo $row['vorCOQuan']; ?></td>
																							<td><?php echo $row['vcasAWBNo']; ?></td>
																							<td><?php echo date('d-m-Y',strtotime($row['vorCODate'])); ?></td>
																							<td><?php if(!is_null($row['vcasAWBAsgnDate']) && !($row['vcasAWBAsgnDate'] == "0000-00-00")) { echo date('d-m-Y',strtotime($row['vcasAWBAsgnDate'])); } ?></td>
																							<td><?php if(!is_null($row['vcasOutScanDate'])) { echo date('d-m-Y',strtotime($row['vcasOutScanDate'])); } ?></td>
																							<td><?php 
																							        $sqlStaff = "SELECT `vmuFirstName` FROM `vsmanageuser` WHERE `vmuRefID`='".$row['vorCreatedBy']."'";
																							        $resStaff = $mysqli->query($sqlStaff);
																							        if($resStaff){ $rowStaff = $resStaff->fetch_assoc(); 
																							        echo $rowStaff['vmuFirstName']; } ?></td>
																							<td><?php echo date('d-m-Y',strtotime($row['vorCreatedDate'])); ?><br><?php echo date('H:i',strtotime($row['vorCreatedDate'])); ?></td>
																							<td><?php echo $row['vorRemarks']; ?></td>
																							<td><a href="CheckStatus.php?vorRefID=<?php echo $row['Orderid'] ?>"><button type="submit" class="btn btn-primary btn-icon-anim btn-circle" ><i class="fa fa-pencil"></i></button></a></td>
										                                                	</tr>
																							<?php } while ($row = $result->fetch_assoc()); }}?>
																						</tbody>
																					</table>
																				
																				</div>
																			</div>
																		</div>
																	</div>
																</div>
															</div>
															<hr>
															<!-- /Row -->
															<div class="row">
																<div class="col-md-11" style="padding-top: 10px;">
																	<table class="table table-hover display  pb-30" >
																		<thead>
																			<tr>
																				<th>#</th>
																				<th>Product Code</th>
																				<th>Product Name</th>
																				<th>Type</th>
																				<th>Stock Avail</th>
																			</tr>
																		</thead>
																		<tbody id="pdspTBody"></tbody>
																		<tfoot id="pdspTFoot"></tfoot>
																	</table>
																</div>
															</div>
														</form>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				
				<div class="modal fade bs-example-modal-lg" id="exampleModal" tabindex="-1" role="dialog" aria-labelledby="myLargeModalLabel" style="display: none;">
					<div class="modal-dialog modal-lg" style="width: 400px;padding-top: 100px;">
						<div class="modal-content">
							<div class="modal-header">
								<button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>
								<h5 class="modal-title" id="myLargeModalLabel">Add Supplier</h5>
							</div>
							<form role="form" method="post" class="form-horizontal" id="Add_From" action="crud/AddSupp.php">
								<div class="modal-body">
									<div class="form-group">
										<label for="message-text" class="col-sm-6 control-label text-left">GST Number</label>
										<div class="col-md-6">	
											<!-- <input type="text" class="form-control" name="vmsTINNum" id="vmsTINNum" placeholder="Ex.33AAACB2484A1DR">  -->
											<input type="text" 
										       class="form-control" 
										       name="vmsTINNum" 
										       id="vmsTINNum"
										       maxlength="15"
										       minlength="15"
										       required
										       placeholder="Ex.33AAACB2484A1DR">

											<small id="gstMsg" style="font-weight:bold;"></small>
										</div>
									</div>
									<div class="form-group">
										<label class="col-sm-6 control-label text-left">Enter supplier Code</label>
										<div class="col-md-6"> 
											<input type="text" class="form-control" name="vmsCode" id="vmsCode" placeholder="SAM">
										</div>
									</div>
									<div class="form-group">
										<label for="message-text" class="col-sm-6 control-label text-left" >Name</label>
										<div class="col-md-6"> 
											<input type="text" class="form-control" name="vmsName" id="vmsName">
										</div>
									</div>
									<div class="form-group">
										<label for="message-text" class="col-sm-6 control-label text-left" >Website Address</label>
										<div class="col-md-6"> 
											<input type="text" class="form-control" name="vmsWebAdd" id="vmsWebAdd">
										</div>
									</div>
									<div class="form-group">
										<label for="message-text" class="col-sm-6 control-label text-left" >Category Type Name</label>
										<div class="col-md-6"> 
											<select class="form-control" id="vmsCategoryType" name="vmsCategoryType">
												<option value=""></option>
											</select>
										</div>
									</div>
									<div class="form-group">
										<label for="message-text" class="col-sm-6 control-label text-left" >Referral type Name</label>
										<div class="col-md-6"> 
											<select class="form-control" id="vmsRefType" name="vmsRefType">
												<option value=""></option>
											</select>
										</div>
									</div>
									<div class="form-group">
										<label for="message-text" class="col-sm-6 control-label text-left">Referral Remarks</label>
										<div class="col-md-6"> 
											<textarea class="form-control" name="vmsRefRemarks" id="vmsRefRemarks"></textarea>
										</div>
									</div>
									
									<div class="form-group">
										<label for="message-text" class="col-sm-6 control-label text-left">CST Number</label>
										<div class="col-md-6">	
											<input type="text" class="form-control" name="vmsCSTNum" id="vmsCSTNum">
										</div>
									</div>
									<div class="form-group">
										<div class="col-md-12">
											<label for="message-text" class="control-label text-left" >Supplier Have Own Product Code</label>
											<input type="checkbox" id="vmsSupOwnProdCode" name="vmsSupOwnProdCode" value="1">
										</div>
									</div>
									<div class="form-group">
										<label for="message-text" class="col-sm-6 control-label text-left" >Remarks Supplier</label>
										<div class="col-md-6"> 
											<textarea class="form-control" name="vmsRemarks" id="vmsRemarks"></textarea>
										</div>
									</div>
								</div>
								<div class="modal-footer" style="text-align: center;">
									<button type="submit" class="btn btn-primary" style="padding: 4px 24px;">CREATE</button>
									<button type="cancel" class="btn btn-default" style="padding: 4px 24px;" data-dismiss="modal">Cancel</button>
								</div>
							</form>
						</div>
						<!-- /.modal-content -->
					</div>
					<!-- /.modal-dialog -->
				</div>
				<div class="row" style="margin-top: 10px;">
					<div class="col-sm-12">
						<div class="panel panel-default card-view">
							<div class="panel-heading">
								<div class="pull-left">
									<h6 class="panel-title txt-dark">Supplier Item List</h6>
								</div>
								<div class="clearfix"></div>
							</div>
							<div class="panel-wrapper collapse in">
								<div class="panel-body">
									<form id="subForm" name="subForm" action="crud/addallitems.php" method="post" class="form-horizontal"></form>
									<div class="table-wrap">
										<div class="table-responsive">
											<table id="datable_11" class="table table-hover display  pb-30" >
												<thead>
													<tr>
														<th>S.NO.</th>
														<th>Item Code</th>
														<th>Item Name</th>
														<th>Price</th>
														<th>Qty</th>
														<th>MRP</th>
														<th>Tax %</th>
														<th>Gross Amount</th>
														<th>Tax Amount</th>
													   <th>Total Amount</th>
													   <th>Pre Order</th>
													   <th>Delete</th>
													</tr>
												</thead>
												<tbody id="addstock"></tbody>
												<tfoot>
													<tr>
														<th></th>
														<th></th>
														<th></th>
														<th></th>
														<th></th>
														<th>Total</th>
														<th></th>
														<th id="totGrossAmount">0</th>
														<th id="totTaxAmount">0</th>
													   <th id="totTotalAmount">0</th>
													   <th></th>
													   <th></th>
													</tr>
												</tfoot>
											</table>
										</div>
									</div>
								</div>
							</div>
							<center><button type="submit" form='subForm' class="btn btn-primary subbtn" onclick="disableButton()">SUBMIT</button></center>
						</div>	
					</div>
				</div></div>
				<!-- Row-->
			</div>
			<!-- /Main Content -->
		</div>
		<!-- /#wrapper -->
		
		<!-- JavaScript -->
		
		<!-- jQuery -->
		<script src="../vendors/bower_components/jquery/dist/jquery.min.js"></script>
		
		<!-- Bootstrap Core JavaScript -->
		<script src="../vendors/bower_components/bootstrap/dist/js/bootstrap.min.js"></script>
		<script src="../vendors/bower_components/jasny-bootstrap/dist/js/jasny-bootstrap.min.js"></script>
		
		<!-- Data table JavaScript -->
		<script src="../vendors/bower_components/datatables/media/js/jquery.dataTables.min.js"></script>
		<script src="dist/js/dataTables-data.js"></script>

		<script src="../vendors/bower_components/datatables.net-buttons/js/dataTables.buttons.min.js"></script>
		<script src="../vendors/bower_components/datatables.net-buttons/js/buttons.flash.min.js"></script>
		<script src="../vendors/bower_components/jszip/dist/jszip.min.js"></script>
		<script src="../vendors/bower_components/pdfmake/build/pdfmake.min.js"></script>
		<script src="../vendors/bower_components/pdfmake/build/vfs_fonts.js"></script>
		<script src="../vendors/bower_components/datatables.net-buttons/js/buttons.html5.min.js"></script>
		<script src="../vendors/bower_components/datatables.net-buttons/js/buttons.print.min.js"></script>

		<!-- Slimscroll JavaScript -->
		<script src="dist/js/jquery.slimscroll.js"></script>
	
		<!-- Fancy Dropdown JS -->
		<script src="dist/js/dropdown-bootstrap-extended.js"></script>
		
		<!-- Owl JavaScript -->
		<script src="../vendors/bower_components/owl.carousel/dist/owl.carousel.min.js"></script>
	
		<!-- Switchery JavaScript -->
		<script src="../vendors/bower_components/switchery/dist/switchery.min.js"></script>
	
		<!-- Init JavaScript -->
		<script src="dist/js/init.js"></script>
		
		<script  src="dist/js/timeout.js"></script>
		<script  src="dist/js/usertype.js"></script>
		
		<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
		
		<script>
			$(document).ready(function() {
	        
				var err = "<?= $err; ?>";
				var succ = "<?= $Succ; ?>";
				if(err!=""){ displaymessage(err);}
				if(succ!=""){ displaymessage(succ);}
				$('.js-example-basic-single').select2();

				$("<style type='text/css'> .btncss{ padding-top: 20px; } </style>").appendTo("body");

				$("div.toolbar1").html('');

				$('#preordtable').DataTable({
					dom: "<'row'<'col-sm-2'l><'col-sm-3'B><'col-sm-3'<'toolbar1'>><'col-sm-3'f>>" + "<'row'<'col-sm-12 btncss'tr>>" + "<'row'<'col-sm-5'i><'col-sm-7'p>>",
					buttons: ['copy','excel','pdf'],
					"ordering": false
				});

				$("div.toolbar1").html('<h6 class="panel-title txt-dark" style="padding-top: 7px;">PreOrder Details</h6>');

				$(".buttons-copy, .buttons-excel, .buttons-pdf").css(
					{ "padding-left": "15px", "padding-right": "15px", "font-size": "12px", "border-radius": "200px" });

				$(".dt-buttons").css(
					{ "margin-top": "22px" });


				fetchSupcategoryType();
				fetchSupRefType();
				
		    });
	  
		  	$('#vsiSupRefID').on('change',function(){
	  		var vmsRefID = $(this).val();
	  		var gsttype = $(this).find(':selected').data('gsttype');
	  		$("#vsiGstType").val(gsttype).change();
	  		
	  		// Fetch GST Number and determine GST Type (Local/IGST)
	  		if(vmsRefID != "0") {
	  			$.ajax({
	  				type: "POST",
	  				url: "includes/fetchSupplierGST.php",
	  				data: { vmsRefID : vmsRefID },
	  				dataType: "json",
	  				success: function(response) {
	  					if(response.vmsTINNum) {
	  						var gstNumber = response.vmsTINNum;
	  						var gstTypeDisplay = gstNumber.startsWith('33') ? 'Local' : 'IGST';
	  						
	  						$('#supplierGstInfo').html(
	  							'<p style="margin: 5px 0; font-size: 13px;"><strong>GST Number:</strong> ' + gstNumber + '</p>' +
	  							'<p style="margin: 5px 0; font-size: 13px;"><strong>GST Type:</strong> <span style="color: #4CAF50; font-weight: bold;">' + gstTypeDisplay + '</span></p>'
	  						);
	  					} else {
	  						$('#supplierGstInfo').html(
	  							'<p style="margin: 0; color: #f44336; font-size: 12px;">No GST information available</p>'
	  						);
	  					}
	  				}
	  			});
	  		} else {
	  			$('#supplierGstInfo').html(
	  				'<p style="margin: 0; color: #999; font-size: 12px;">Select a supplier first</p>'
	  			);
	  		}
	  	});

		  	$("#newMrp").on('input',function(){
		  		$("#updmrp").attr('disabled', false);
		  	});

		  	$("#updmrp").on('click',function(){
			  	var newMrp = $("#newMrp").val();
			  	var prodid = $('#vspRefID').val();
			  	console.log(newMrp);
			  	$.ajax({
					type: "POST",
					url: 'crud/edMrp.php',
					data: {mrp : newMrp, prodid : prodid},
					dataType: 'json',
					success: function (data) {
						displaymessage(data.message);
						$('#vspRefID').change().trigger('change');
			        }
			    });
		  	});
		
		   	$('#vspRefID').on('change',function(){
		   		$("#pdspTBody").empty();
		   		$("#pdspTFoot").empty();
			 	$("#pdspTBody").append("<tr><td>Loading ...</td></tr>");
				var value = $(this).val();
				var preqty = 0;
				var dataString = 'vspRefID='+ value;
				$.ajax({
					type: "POST",
						url: 'includes/get_ProdCode.php',
						data: dataString,
						dataType: 'json',
						success: function (data)
						{
							console.log(data);
						$('#ItemCode').val(data.ItemCode);
						$('#vmRefID').val(data.vmRefID);
						//$('#preqty').html(data.preqty ?? '0');
						$('#price').html(data.price ?? '0');
						$('#princltax').html(data.princltax ?? '0');
						$('#perc').html(data.perc ?? '0');
						$('#oldMrp').val(data.mrp ?? '0');
						$('#newMrp').val(data.mrp ?? '0');
						$('#mrpspan').html(data.mrp ?? '0');
						$('#penqty').html(data.ordcnt ?? '0');
						$('#vsuTaxPercent').val(data.perc ?? '0');

						
						/*$("#vsuTaxPercent > option").each(function() {
							var vsuTaxPercent = parseFloat($(this).text()) || 0;
							if(vsuTaxPercent == data.perc) {
								$(this).attr('selected',true);
							}
						});*/
		            }
		        });

		        $.ajax({
					type: "POST",
						url: 'includes/get_ProdQty.php',
						data: dataString,
						dataType: 'json',
						success: function (data) {
							$("#pdspTBody").empty();
							$("#pdspTFoot").empty();
							var j = 0; var totstock = 0;
							for(k=0;k<data.length;k++) {

								j++; totstock = data[k]['totstock'];
							myString="<tr><td>"+j+
							"</td><td>"+data[k]['code']+
							"</td><td>"+data[k]['name']+
							"</td><td>"+data[k]['type']+
							"</td><td>"+data[k]['stock']+
							"</td></tr>";
							$("#pdspTBody").append(myString);  
						}

						myString="<tr><td>"+
						"</td><td>"+
						"</td><td>"+
						"</td><td>Total"+
						"</td><td>"+totstock+
						"</td></tr>";
						$("#pdspTFoot").append(myString);  
		            }
		        });

		        var t = $('#preordtable').DataTable();

		        t.clear().draw();
			
		 		$.ajax({
					type: "POST",
						url: 'includes/get_ProdPreOrders.php',
						data: dataString,
						dataType: 'json',
						success: function (data) {
							for(k=0;k<data.length;k++) {
								preqty = preqty + parseInt(data[k]['qty']);
								t.row.add( [
									data[k]['clt'],
									data[k]['cltordno'],
									data[k]['ordno'],
									data[k]['packno'],
									data[k]['packsta'],
									data[k]['couname'],
									data[k]['shpmod'],
									data[k]['qty'],
									data[k]['awb'],
									data[k]['orddt'],
									data[k]['awbdt'],
									data[k]['outdt'],
									data[k]['preorddt']
								] ).draw( false );	
						}

						t.draw();
						$('#preqty').html(preqty ?? '0');
		            }
		        });
			});	
		</script>
		<script>
		    const invDate = document.getElementById('vsiInvDate');

		    invDate.addEventListener('input', function () {
		        let selected = new Date(this.value);
		        let today = new Date();

		        // convert today to yyyy-mm-dd format
		        today = new Date(today.toISOString().split("T")[0]);

		        if (selected > today) {
		            alert("Future date not allowed!");
		            this.value = today.toISOString().split("T")[0]; // reset to today's date
		        }
		    });

			function validateInvoiceDate() {

			    if (!invDate.value) return;

			    let selectedDate = new Date(invDate.value);

			    let today = new Date();
			    today.setHours(0,0,0,0);

			    let oneMonthAgo = new Date();
			    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
			    oneMonthAgo.setHours(0,0,0,0);

			    if (selectedDate > today) {
			        alert("Future date is not allowed.");
			        invDate.value = today.toISOString().split('T')[0];
			        return;
			    }

			    if (selectedDate < oneMonthAgo) {
			        alert("Invoice date cannot be older than 1 month.");
			        invDate.value = today.toISOString().split('T')[0];
			        return;
			    }
			}

			// Validate while typing and on date selection
			invDate.addEventListener('input', validateInvoiceDate);
			invDate.addEventListener('change', validateInvoiceDate);
		</script>
		<script>
			function fetchSupcategoryType(){
				$.ajax({
					type: "POST",
						url: 'includes/fetchSupcategoryType.php',
						dataType: 'json',
						success: function (data)
						{
						var mystring = "<option value=0>--Select--</option>";
						$("#vmsCategoryType").empty();
						$("#vmsCategoryType").append(mystring);
						for(j=0;j<data.length;j++)
						{
							mystring="<option value="+data[j].vsscRefID+" id="+data[j].vsscRefID+">"+data[j].vsscType+"</option>";
							$("#vmsCategoryType").append(mystring);
							
						}
						return;
		            }
		        });
			}


	
			function fetchSupRefType(){
				$.ajax({
					type: "POST",
						url: 'includes/fetchSupRefType.php',
						dataType: 'json',
						success: function (data)
						{
						var mystring = "<option value=0>--Select--</option>";
						$("#vmsRefType").empty();
						$("#vmsRefType").append(mystring);
						for(j=0;j<data.length;j++)
						{
							mystring="<option value="+data[j].vedRefID+" id="+data[j].vedRefID+">"+data[j].vedDocName+"</option>";
							$("#vmsRefType").append(mystring);
							
						}
						return;
		            }
		        });
			}

			$('#addBtn').on('click', function() {

				if($('#vsiSupRefID').val() == "0"){
					displaymessage('Supplier Name to be Selected');
				}else if($('#vsiPONo').val() == ""){
					displaymessage('PO Number is Required');
				}else if($('#vsiInvNo').val() == ""){
					displaymessage('Invoice Number is Required');
				}else if($('#vsiInvDate').val() == ""){
					displaymessage('Invoice Date is Required');
				}else if($('#vsuQtyRecd').val() == ""){
					displaymessage('Quantity is Required');
				}else if($('#vspRefID').val() == "0"){
					displaymessage('Item Name is Required');
				}else if($('#vsuTaxPercent').val() == "" ){
					displaymessage('Tax is Required');
				}else{
				    var slno = $("#addstock tr").length + 1;
					var vspRefID = $('#vsiSupRefID').val();
					var gstType = $("#vsiGstType").val();
					var itemName = $('#vspRefID option:selected').text();
					var ItemCode = $('#ItemCode').val();
					var TvmRefID = $('#vmRefID').val();
					var vsuPrice = parseFloat($('#vsuPrice').val()) || 0 ;
					var vsuQtyRecd = parseFloat($('#vsuQtyRecd').val()) || 0;
					var vsuTaxType = $('#vsuTaxType').val();
					var vsuTaxPercent = $('#vsuTaxPercent').val();
					if(vsuTaxType == '1') {taxType = 'Other';} else {taxType = "";}
					//var vsuTaxPercent = parseFloat($('#vsuTaxPercent option:selected').text()) || 0;
					var GrAmt = vsuPrice * vsuQtyRecd;
					var TaxAmt = GrAmt * vsuTaxPercent / 100;
					var TotAmt = GrAmt + TaxAmt;
					var preqty = $("#preqty").html();
					var oldMrp = $("#oldMrp").val();
					var newMrp = $("#newMrp").val();
					
					var TabBody = "<tr><td><span class='slno form-control'>"+slno+"</span></td><td><input type='text' form='subForm' id='itmCode"+slno+"' name='itmCode[]' value='"+ItemCode+"' readonly><input type='hidden' form='subForm' name='TgstType[]' value='"+gstType+"'><input type='hidden' form='subForm' name='TvspRefID[]' value='"+vspRefID+"'><input type='hidden' form='subForm' name='TvmRefID[]' value='"+TvmRefID+"'></td><td><input type='text' form='subForm' id='itemName"+slno+"' name='itemName[]' value='"+itemName+"' style='width: 500px;'  readonly></td><td><input type='text' form='subForm' id='vsuPrice"+slno+"' name='TvsuPrice[]' class='vsuPrice' value='"+vsuPrice+"'></td><td><input type='text' form='subForm' id='vsuQtyRecd"+slno+"' name='TvsuQtyRecd[]' class='vsuQtyRecd' value='"+vsuQtyRecd+"'></td><td><input type='text' form='subForm' id='newMrp"+slno+"' name='TnewMrp[]' value='"+newMrp+"' readonly><input type='hidden' form='subForm' name='ToldMrp[]' value='"+oldMrp+"'><input type='hidden' form='subForm' name='TvsuTaxType[]' value='"+vsuTaxType+"'></td><td><input type='text' form='subForm' id='vsuTaxPercent"+slno+"' name='TvsuTaxPercent[]' class='vsuTaxPercent' value='"+vsuTaxPercent+"'></td><td><input type='text' form='subForm' id='GrAmt"+slno+"' name='GrAmt[]' value='"+GrAmt.toFixed(2)+"' readonly></td><td><input type='text' form='subForm' id='TaxAmt"+slno+"' name='TaxAmt[]' value='"+TaxAmt.toFixed(2)+"' readonly></td><td><input type='text' form='subForm' id='TotAmt"+slno+"' name='TotAmt[]' value='"+TotAmt.toFixed(2)+"' readonly></td><td><input type='text' form='subForm' id='preqty"+slno+"' name='preqty[]' value='"+preqty+"' readonly></td><td><button type='button' id='btndel"+slno+"' class='btndele btn btn-info btn-icon-anim btn-circle'><i class='icon-trash'></i></button></td></tr>";
					$('#addstock').append(TabBody);
					
					$('#addForm').trigger("reset");
					//$(this).closest("form").reset();
					console.log($(this).closest("form"));
					$('#vsiSupRefID').attr('readonly',true);
					$('#vsiGstType').attr('readonly',true);
					$('#vsiPONo').attr('readonly',true);
					$('#vsiInvNo').attr('readonly',true);
					$('#vsiInvDate').attr('readonly',true);
					updateTotal();
				}
				
			});

			$(document).on('input','.vsuPrice,.vsuQtyRecd,.vsuTaxPercent',function(){
			    var vsuPrice = parseFloat($(this).closest('tr').children('td:eq(3)').children('input').val()) || 0 ;
				var vsuQtyRecd = parseFloat($(this).closest('tr').children('td:eq(4)').children('input').val()) || 0;
				var vsuTaxPercent = parseFloat($(this).closest('tr').children('td:eq(6)').children('input').val()) || 0;
				var GrAmt = vsuPrice * vsuQtyRecd;
				var TaxAmt = GrAmt * vsuTaxPercent / 100;
				var TotAmt = GrAmt + TaxAmt;
				$(this).closest('tr').children('td:eq(7)').children('input').val(GrAmt.toFixed(2));
				$(this).closest('tr').children('td:eq(8)').children('input').val(TaxAmt.toFixed(2));
				$(this).closest('tr').children('td:eq(9)').children('input').val(TotAmt.toFixed(2));
				updateTotal();
			});

			$(document).on('click','.btndele',function(){
				$(this).parent().parent().remove();
				var cnt = 1;
				$('.slno').each(function() { $(this).html(cnt); cnt += 1; });
				updateTotal();
			});
				
			function updateTotal() {
			    var totGrAmt = 0;
			    var totTaxAmt = 0;
			    var totTotAmt = 0;
			    $('#addstock > tr').each(function() {
			        GrAmt = parseFloat($(this).children('td:eq(7)').children('input').val()) || 0 ;
			        TaxAmt = parseFloat($(this).children('td:eq(8)').children('input').val()) || 0 ;
			        TotAmt = parseFloat($(this).children('td:eq(9)').children('input').val()) || 0 ;
			        totGrAmt += GrAmt;
			        totTaxAmt += TaxAmt;
			        totTotAmt += TotAmt;
			    });
			    $("#totGrossAmount").html(totGrAmt.toFixed(2));
				$("#totTaxAmount").html(totTaxAmt.toFixed(2));
				$("#totTotalAmount").html(totTotAmt.toFixed(2));
			}

			function disableButton() {
		        var submitButton = document.querySelector('.subbtn');

		        // Check if the button is not already disabled
		        if (!submitButton.disabled) {
		            // Disable the button
		            submitButton.disabled = true;
		            document.getElementById('subForm').submit(); 
		        }
		    }

		    
		</script>
		<script>
			$('#vmsTINNum').on('keyup blur', function () {

		    var gstNo = $(this).val().trim().toUpperCase();

		    $('#vmsTINNum').val(gstNo);

		    // Clear message if empty
		    if(gstNo == '')
		    {
		        $('#gstMsg').html('');
		        return false;
		    }

		    // Wait until 15 chars entered
		    if(gstNo.length < 15)
		    {
		        $('#gstMsg').html(
		            '<span style="color:orange;font-weight:bold;">Enter complete GST Number</span>'
		        );
		        return false;
		    }

		    $.ajax({
		        type: "POST",
		        url: "includes/checkGSTNumber.php",
		        data: { gstNo : gstNo },
		        dataType: "json",

		        success: function(response)
		        {

		            if(response.status == 'exists')
		            {

		                $('#gstMsg').html(
		                    '<span style="color:red;font-weight:bold;">❌ GST Already Exists</span><br>' +
		                    '<span style="color:#000;">Supplier Name : <b>' + response.supplierName + '</b></span><br>' +
		                    '<span style="color:#000;">GST Number : <b>' + response.gstNo + '</b></span>'
		                );

		            }
		            else
		            {

		                $('#gstMsg').html(
		                    '<span style="color:green;font-weight:bold;">✔ Supplier Not Created</span>'
		                );

		            }

		        }

		    });

		});

		</script>
		<script>

			$('#Add_From').on('submit', function(e){

			    var gstNo = $('#vmsTINNum').val().trim();

			    // Empty GST Check
			    if(gstNo == '')
			    {
			        e.preventDefault();

			        $('#gstMsg').html(
			            '<span style="color:red;font-weight:bold;">GST Number is Required</span>'
			        );

			        $('#vmsTINNum').focus();

			        return false;
			    }

			    // GST Length Check
			    if(gstNo.length != 15)
			    {
			        e.preventDefault();

			        $('#gstMsg').html(
			            '<span style="color:red;font-weight:bold;">Enter Valid GST Number</span>'
			        );

			        $('#vmsTINNum').focus();

			        return false;
			    }

			    // Duplicate GST Check
			    if($('#gstMsg').text().includes('Already Exists'))
			    {
			        e.preventDefault();

			        alert('GST Number already exists!');

			        $('#vmsTINNum').focus();

			        return false;
			    }

			});

		</script>
	</body>
</html>